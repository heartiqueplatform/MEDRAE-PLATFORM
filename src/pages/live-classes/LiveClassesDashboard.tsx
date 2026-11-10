// src/pages/live-classes/LiveClassesDashboard.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { liveClassService, registrationService } from "@/services/liveClassService";
import { toast } from "sonner";
import {
    Calendar,
    Clock,
    Users,
    Video,
    MapPin,
    Award,
    Trash2,
    AlertTriangle,
    X,
    Loader2,
    ChevronLeft,
    Plus,
    LayoutGrid,
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

function LiveClassesSkeleton() {
    return (
        <div className="w-full max-w-[880px] mx-auto px-4 py-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 h-16 animate-pulse"
                    />
                ))}
            </div>
            <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-full bg-white dark:bg-[#161b22] h-8 animate-pulse"
                    />
                ))}
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#161b22] h-52 animate-pulse" />
            <div className="rounded-2xl bg-white dark:bg-[#161b22] h-52 animate-pulse" />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation modal                                          */
/* ------------------------------------------------------------------ */

function DeleteModal({
    open,
    cls,
    onCancel,
    onConfirm,
    deleting,
}: {
    open: boolean;
    cls: any;
    onCancel: () => void;
    onConfirm: () => void;
    deleting: boolean;
}) {
    if (!open || !cls) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center
                       bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
            style={{ WebkitTapHighlightColor: "transparent" }}
        >
            <div
                className="relative w-full sm:max-w-md
                           bg-white dark:bg-[#161b22]
                           rounded-t-2xl sm:rounded-2xl
                           max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle (mobile) */}
                <div className="sm:hidden flex justify-center pt-2.5 pb-1">
                    <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-white/[0.15]" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-400/10 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Delete class
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        aria-label="Close"
                        className="h-9 w-9 rounded-full flex items-center justify-center
                                   active:bg-slate-100 dark:active:bg-white/5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                        Are you sure you want to delete this class?
                    </p>
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {cls.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDate(cls.class_date)} · {cls.start_time?.slice(0, 5)}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {cls.registration_count} student
                            {cls.registration_count === 1 ? "" : "s"} registered
                        </p>
                    </div>
                    <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3">
                        <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-2 leading-snug">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>
                                This cannot be undone. All registrations and resources
                                will be permanently deleted.
                            </span>
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 pt-1 flex gap-2">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ touchAction: "manipulation" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 h-10 rounded-xl bg-rose-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform
                                   flex items-center justify-center gap-1.5
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ touchAction: "manipulation" }}
                    >
                        {deleting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export const LiveClassesDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("upcoming");
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [classesData, registrations] = await Promise.all([
                liveClassService.getAllClasses(),
                user
                    ? registrationService.getUserRegistrations()
                    : Promise.resolve([]),
            ]);
            setClasses(classesData || []);
            setRegisteredIds(
                new Set((registrations || []).map((r: any) => r.class_id))
            );
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load classes");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (classId: string) => {
        if (!user) {
            toast.error("Please log in first");
            navigate("/login");
            return;
        }
        tap("success");
        try {
            await registrationService.registerForClass(classId);
            await loadData();
        } catch (error) {
            /* handled in service */
        }
    };

    const handleDeleteClick = (cls: any) => {
        tap("warning");
        setClassToDelete(cls);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!classToDelete) return;
        setDeleting(true);
        try {
            await liveClassService.deleteClass(classToDelete.id);
            setDeleteModalOpen(false);
            setClassToDelete(null);
            await loadData();
        } catch (error) {
            console.error("Error deleting class:", error);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setClassToDelete(null);
    };

    const filteredClasses = classes.filter((cls: any) => {
        if (filter === "all") return true;
        return cls.status === filter;
    });

    const isOwner = (cls: any) => user && cls.host_user_id === user.id;

    const handleBack = useCallback(() => {
        tap();
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/dashboard/student", { replace: true });
        }
    }, [navigate]);

    const upcomingCount = classes.filter((c: any) => c.status === "upcoming").length;
    const liveCount = classes.filter((c: any) => c.status === "live").length;

    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-white">
                <header className="shrink-0 h-14 bg-white dark:bg-[#0d1117] border-b border-slate-200/70 dark:border-white/[0.06] flex items-center px-2">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    <div className="ml-2 space-y-1.5">
                        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto no-scrollbar">
                    <LiveClassesSkeleton />
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
                            Live Classes
                        </h1>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                            {classes.length} total · {liveCount} live · {upcomingCount} upcoming
                        </p>
                    </div>


                </div>
            </header>

            {/* ── SCROLLABLE BODY ── */}
            <main
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="w-full max-w-[880px] mx-auto pb-16">
                    {/* Hero */}
                    <section className="px-4 pt-5 pb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                                <Video className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    Live sessions
                                </p>
                                <h2 className="text-lg font-bold leading-tight">
                                    Join a class
                                </h2>
                            </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Join live sessions with tutors and earn CPD points.
                        </p>
                    </section>

                    {/* Stats */}
                    <section className="px-4 mb-5">
                        <div className="grid grid-cols-4 gap-2">
                            <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                <LayoutGrid className="mx-auto mb-1 h-4 w-4 text-slate-600 dark:text-slate-400" />
                                <p className="text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">
                                    {classes.length}
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
                                <Video className="mx-auto mb-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {liveCount}
                                </p>
                                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Live
                                </p>
                            </div>
                            <div className="rounded-xl bg-white dark:bg-[#161b22] p-2.5 text-center">
                                <Calendar className="mx-auto mb-1 h-4 w-4 text-slate-400" />
                                <p className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300">
                                    {registeredIds.size}
                                </p>
                                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Joined
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Filters */}
                    <section className="px-4 mb-4">
                        <div className="flex gap-1.5">
                            {["upcoming", "live", "completed", "all"].map((status) => (
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

                    {/* Classes */}
                    <section className="px-4">
                        {filteredClasses.length === 0 ? (
                            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-8 text-center">
                                <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                                <p className="font-semibold text-sm">
                                    No {filter === "all" ? "" : filter + " "}classes
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Check back later for new sessions.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {filteredClasses.map((cls: any) => {
                                    const isRegistered = registeredIds.has(cls.id);
                                    const isFull =
                                        cls.registration_count >= cls.max_students;
                                    const isUpcoming =
                                        cls.status === "upcoming" || cls.status === "live";
                                    const isLive = cls.status === "live";
                                    const isClassOwner = isOwner(cls);

                                    return (
                                        <div
                                            key={cls.id}
                                            className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden"
                                        >
                                            {cls.cover_image_url && (
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
                                                        {cls.title}
                                                    </h3>
                                                    {isLive ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                                         text-[10px] font-bold shrink-0
                                                                         bg-emerald-100 text-emerald-700
                                                                         dark:bg-emerald-400/10 dark:text-emerald-300 animate-pulse">
                                                            Live now
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                                        text-[10px] font-bold shrink-0
                                                                        ${cls.status === "upcoming"
                                                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
                                                                    : cls.status === "completed"
                                                                        ? "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                                                                        : "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
                                                                }`}
                                                        >
                                                            {cls.status}
                                                        </span>
                                                    )}
                                                </div>

                                                {cls.description && (
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                                                        {cls.description}
                                                    </p>
                                                )}

                                                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                                        <span>{formatDate(cls.class_date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3 flex-shrink-0" />
                                                        <span>
                                                            {cls.start_time?.slice(0, 5)} –{" "}
                                                            {cls.end_time?.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="w-3 h-3 flex-shrink-0" />
                                                        <span>
                                                            {cls.registration_count} / {cls.max_students}
                                                        </span>
                                                    </div>
                                                    {cls.is_cpd_eligible && (
                                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                            <Award className="w-3 h-3 flex-shrink-0" />
                                                            <span>{cls.cpd_points} CPD</span>
                                                        </div>
                                                    )}
                                                    {isClassOwner && (
                                                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                                            <span>You are the host</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-3 flex gap-1.5">
                                                    {isUpcoming && !isFull && !isRegistered && (
                                                        <button
                                                            onClick={() => handleRegister(cls.id)}
                                                            className="flex-1 h-9 rounded-lg bg-blue-600 text-white
                                                                       text-xs font-bold
                                                                       active:scale-[0.97] transition-transform"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            Register
                                                        </button>
                                                    )}
                                                    {isUpcoming && isFull && !isRegistered && (
                                                        <button
                                                            disabled
                                                            className="flex-1 h-9 rounded-lg bg-slate-200 dark:bg-white/[0.06]
                                                                       text-slate-500 dark:text-slate-400
                                                                       text-xs font-bold cursor-not-allowed"
                                                        >
                                                            Full
                                                        </button>
                                                    )}
                                                    {isRegistered && isUpcoming && !isLive && (
                                                        <button
                                                            onClick={() => {
                                                                tap();
                                                                navigate(`/live-classes/${cls.id}`);
                                                            }}
                                                            className="flex-1 h-9 rounded-lg bg-emerald-600 text-white
                                                                       text-xs font-bold
                                                                       active:scale-[0.97] transition-transform"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            View
                                                        </button>
                                                    )}
                                                    {isLive && cls.meeting_link && (
                                                        <button
                                                            onClick={() => {
                                                                tap("success");
                                                                window.open(cls.meeting_link, "_blank");
                                                            }}
                                                            className="flex-1 h-9 rounded-lg bg-rose-600 text-white
                                                                       text-xs font-bold
                                                                       active:scale-[0.97] transition-transform
                                                                       flex items-center justify-center gap-1.5"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            <Video className="h-3.5 w-3.5" />
                                                            Join
                                                        </button>
                                                    )}
                                                    {!isUpcoming && !isRegistered && (
                                                        <button
                                                            onClick={() => {
                                                                tap();
                                                                navigate(`/live-classes/${cls.id}`);
                                                            }}
                                                            className="flex-1 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06]
                                                                       text-slate-700 dark:text-slate-200
                                                                       text-xs font-bold
                                                                       active:scale-[0.97] transition-transform"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            Details
                                                        </button>
                                                    )}
                                                    {/* 🍼 WhatsApp-style FAB — create a new class */}

                                                    {isClassOwner && (
                                                        <button
                                                            onClick={() => handleDeleteClick(cls)}
                                                            aria-label="Delete class"
                                                            className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-400/10
                                                                       text-rose-600 dark:text-rose-400
                                                                       active:scale-[0.97] transition-transform
                                                                       flex items-center justify-center shrink-0"
                                                            style={{ touchAction: "manipulation" }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
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
                </div>
            </main>
            <button
                onClick={() => {
                    tap("success");
                    navigate("/live-classes/create");
                }}
                aria-label="Create class"
                className="fixed bottom-24 right-4 z-40
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
            {/* Delete modal */}
            <DeleteModal
                open={deleteModalOpen}
                cls={classToDelete}
                onCancel={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                deleting={deleting}
            />
        </div>
    );
};