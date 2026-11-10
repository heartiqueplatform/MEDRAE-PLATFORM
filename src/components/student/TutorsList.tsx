"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Loader2,
    Users,
    Megaphone,
    CheckCircle,
    ArrowUpRight,
    Sparkles,
    GraduationCap,
    Zap,
    School,
    Building2,
    Info,
    UserPlus,
    Eye,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { CenteredModal } from "@/components/ui/CenteredModal";
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TutorClass {
    id: string;
    tutor_id: string;
    block: string;
    year: number;
    semester: number;
    class_name?: string;
    description?: string;
    max_students?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    student_count?: number;
}

interface Tutor {
    user_id: string;
    name: string;
    username: string;
    specialization: string;
    avatar_url: string;
    bio?: string;
    institution?: string;
    classes?: TutorClass[];
}

interface Cohort {
    tutor_id: string;
    block: string;
    year: number;
    semester: number;
    profiles?: { name: string };
}

interface Announcement {
    id: string;
    message: string;
    tutor_id: string;
    block: string;
    year: number;
    semester: number;
    created_at: string;
}

interface DashboardData {
    cohorts: Cohort[];
    announcements: Announcement[];
    read_message_ids: string[];
}

interface CachedData<T> {
    data: T;
    timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

const TUTORS_CACHE_KEY = "student_tutors_with_classes_cache";
const DASHBOARD_CACHE_KEY = "dashboard_cache";
const TUTORS_CACHE_DURATION = 24 * 60 * 60 * 1000;
const DASHBOARD_CACHE_DURATION = 15 * 60 * 1000;

function getCachedData<T>(key: string): CachedData<T> | null {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        return JSON.parse(cached);
    } catch {
        return null;
    }
}

function saveCachedData<T>(key: string, data: T): void {
    try {
        localStorage.setItem(
            key,
            JSON.stringify({ data, timestamp: Date.now() })
        );
    } catch {
        /* silent */
    }
}

function isCacheValid<T>(cached: CachedData<T> | null, duration: number): boolean {
    if (!cached) return false;
    return Date.now() - cached.timestamp < duration;
}

/* ------------------------------------------------------------------ */
/*  Class details modal                                                */
/* ------------------------------------------------------------------ */

const ClassDetailsModal = ({
    isOpen,
    onClose,
    classData,
    tutor,
    onJoin,
    joining,
    existingCohorts = [],
}: {
    isOpen: boolean;
    onClose: () => void;
    classData: TutorClass | null;
    tutor: Tutor | null;
    onJoin: (cls?: TutorClass) => void;
    joining: boolean;
    existingCohorts?: Cohort[];
}) => {
    const [currentClassIndex, setCurrentClassIndex] = useState(0);
    const classes = tutor?.classes || [];

    useEffect(() => {
        if (isOpen && classData && classes.length > 0) {
            const index = classes.findIndex((c) => c.id === classData.id);
            setCurrentClassIndex(index >= 0 ? index : 0);
        }
    }, [isOpen, classData, classes]);

    if (!classData || !tutor || classes.length === 0) return null;

    const currentClass = classes[currentClassIndex] || classData;

    const handlePrevious = () => {
        tap();
        setCurrentClassIndex((prev) => (prev > 0 ? prev - 1 : classes.length - 1));
    };
    const handleNext = () => {
        tap();
        setCurrentClassIndex((prev) => (prev < classes.length - 1 ? prev + 1 : 0));
    };

    const isCurrentClassJoined =
        existingCohorts.some(
            (c) =>
                c.tutor_id === tutor.user_id &&
                c.block === currentClass.block &&
                c.year === currentClass.year &&
                c.semester === currentClass.semester
        ) || false;

    return (
        <CenteredModal
            open={isOpen}
            onClose={onClose}
            title="Class details"
            maxWidthClass="max-w-md"
            maxHeight="90vh"
        >
            {/* Tutor header */}
            <div className="px-4 pt-2 pb-3 flex items-center gap-3">
                <Avatar className="w-12 h-12 ring-2 ring-slate-200 dark:ring-white/[0.06] shrink-0">
                    {tutor.avatar_url ? (
                        <AvatarImage src={tutor.avatar_url} className="object-cover" />
                    ) : (
                        <AvatarFallback className="bg-emerald-600 text-white text-base font-bold">
                            {tutor.name?.[0] || "T"}
                        </AvatarFallback>
                    )}
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Tutor
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tutor.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {tutor.specialization || "General Expert"}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider tabular-nums">
                        {currentClassIndex + 1}/{classes.length}
                    </p>
                </div>
            </div>

            {/* Class navigation */}
            <div className="px-4 flex items-center gap-2 mb-3">
                <button
                    onClick={handlePrevious}
                    disabled={classes.length <= 1}
                    className="h-8 w-8 rounded-full flex items-center justify-center
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-600 dark:text-slate-300
                               active:scale-[0.95] transition-transform
                               disabled:opacity-30"
                    style={{ touchAction: "manipulation" }}
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="flex-1 min-w-0 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {currentClass.class_name || `Block ${currentClass.block}`}
                        </h2>
                    </div>
                    <div className="flex justify-center gap-1.5 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300 font-bold">
                            B{currentClass.block}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300 font-bold">
                            Y{currentClass.year}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300 font-bold">
                            S{currentClass.semester}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleNext}
                    disabled={classes.length <= 1}
                    className="h-8 w-8 rounded-full flex items-center justify-center
                               bg-slate-100 dark:bg-white/[0.06]
                               text-slate-600 dark:text-slate-300
                               active:scale-[0.95] transition-transform
                               disabled:opacity-30"
                    style={{ touchAction: "manipulation" }}
                >
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>

            {/* Dots */}
            {classes.length > 1 && (
                <div className="flex justify-center gap-1 mb-3">
                    {classes.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                tap();
                                setCurrentClassIndex(idx);
                            }}
                            className={`h-1 rounded-full transition-all ${idx === currentClassIndex
                                ? "w-4 bg-emerald-600"
                                : "w-1 bg-slate-300 dark:bg-white/[0.15]"
                                }`}
                            style={{ touchAction: "manipulation" }}
                        />
                    ))}
                </div>
            )}

            {/* Description */}
            {currentClass.description && (
                <div className="px-4 pb-3">
                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Description
                            </p>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                            {currentClass.description}
                        </p>
                    </div>
                </div>
            )}

            {/* Stats grid */}
            <div className="px-4 grid grid-cols-2 gap-2 pb-3">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-400/10 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        Created
                    </p>
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                        {new Date(currentClass.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </p>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Status
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {currentClass.is_active ? "Active" : "Inactive"}
                    </p>
                </div>
                {currentClass.student_count !== undefined && (
                    <div className="rounded-xl bg-violet-50 dark:bg-violet-400/10 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                            Students
                        </p>
                        <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                            <Users className="h-3 w-3 shrink-0" />
                            {currentClass.student_count}
                        </p>
                    </div>
                )}
                {currentClass.max_students && (
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-400/10 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            Capacity
                        </p>
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <UserPlus className="h-3 w-3 shrink-0" />
                            Max {currentClass.max_students}
                        </p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                    onClick={onClose}
                    className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                               text-slate-700 dark:text-slate-200
                               text-sm font-bold
                               active:scale-[0.97] transition-transform"
                    style={{ touchAction: "manipulation" }}
                >
                    Close
                </button>
                {!isCurrentClassJoined ? (
                    <button
                        onClick={() => {
                            tap("success");
                            onJoin(currentClass);
                        }}
                        disabled={joining}
                        className="flex-[2] h-10 rounded-xl bg-emerald-600 text-white
                                   text-sm font-bold
                                   active:scale-[0.97] transition-transform
                                   flex items-center justify-center gap-1.5
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ touchAction: "manipulation" }}
                    >
                        {joining ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Joining…
                            </>
                        ) : (
                            "Join class"
                        )}
                    </button>
                ) : (
                    <button
                        disabled
                        className="flex-[2] h-10 rounded-xl bg-emerald-50 dark:bg-emerald-400/10
                                   text-emerald-700 dark:text-emerald-300
                                   text-sm font-bold cursor-default
                                   flex items-center justify-center gap-1.5"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Joined
                    </button>
                )}
            </div>

            {/* Other classes */}
            {classes.length > 1 && (
                <div className="px-4 pt-2 pb-4 border-t border-slate-100 dark:border-white/[0.06]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Other classes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {classes.map((cls, idx) => {
                            const isThisJoined =
                                existingCohorts.some(
                                    (c) =>
                                        c.tutor_id === tutor.user_id &&
                                        c.block === cls.block &&
                                        c.year === cls.year &&
                                        c.semester === cls.semester
                                ) || false;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        tap();
                                        setCurrentClassIndex(idx);
                                    }}
                                    className={`text-[10px] font-bold uppercase tracking-wider
                                                px-2 py-1 rounded-lg transition-colors max-w-[120px] truncate
                                                ${idx === currentClassIndex
                                            ? "bg-emerald-600 text-white"
                                            : isThisJoined
                                                ? "bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
                                                : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {cls.class_name || `B${cls.block}`}
                                    {isThisJoined && " ✓"}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </CenteredModal>
    );
};

/* ------------------------------------------------------------------ */
/*  Tutor card                                                         */
/* ------------------------------------------------------------------ */

const SmartTutorCard = ({
    tutor,
    onClassClick,
    onViewClasses,
    isJoined,
    joinedClasses,
}: {
    tutor: Tutor;
    onJoin: () => void;
    onClassClick: (cls: { block: string; year: number; semester: number; class_name?: string }) => void;
    onViewClasses: () => void;
    isJoined: boolean;
    joinedClasses: string[];
}) => {
    const classes = tutor.classes || [];
    const availableClasses = classes.filter(
        (c) => !joinedClasses.includes(`${c.block}-${c.year}-${c.semester}`)
    );

    return (
        <div
            className={`relative rounded-2xl p-4
                        ${isJoined
                    ? "bg-emerald-50/50 dark:bg-emerald-400/[0.06]"
                    : "bg-white dark:bg-[#161b22]"
                }`}
        >
            <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                    <Avatar className="w-12 h-12 ring-2 ring-slate-200 dark:ring-white/[0.06]">
                        {tutor.avatar_url ? (
                            <AvatarImage src={tutor.avatar_url} className="object-cover" />
                        ) : (
                            <AvatarFallback className="bg-emerald-600 text-white text-base font-bold">
                                {tutor.name?.[0] || "T"}
                            </AvatarFallback>
                        )}
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
                                    bg-emerald-500 ring-2 ring-white dark:ring-[#161b22]" />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tutor.name || "Unknown Tutor"}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                            @{tutor.username || "expert"}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                            {tutor.specialization || "General Expert"}
                        </span>
                    </div>
                    {tutor.institution && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{tutor.institution}</span>
                        </div>
                    )}
                    {tutor.bio && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                            {tutor.bio}
                        </p>
                    )}
                </div>
            </div>

            {/* Classes row */}
            {classes.length > 0 && (
                <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <School className="w-3 h-3" />
                        Classes ({classes.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {classes.slice(0, 3).map((cls, idx) => {
                            const classKey = `${cls.block}-${cls.year}-${cls.semester}`;
                            const isThisClassJoined = joinedClasses.includes(classKey);
                            return (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isThisClassJoined) {
                                            tap();
                                            onClassClick({
                                                block: cls.block,
                                                year: cls.year,
                                                semester: cls.semester,
                                                class_name: cls.class_name,
                                            });
                                        }
                                    }}
                                    disabled={isThisClassJoined}
                                    className={`text-[10px] font-bold uppercase tracking-wider
                                                px-2 py-1 rounded-lg transition-colors
                                                ${isThisClassJoined
                                            ? "bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 cursor-default"
                                            : "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300"
                                        }`}
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {isThisClassJoined
                                        ? "Joined"
                                        : cls.class_name || `B${cls.block}`}
                                </button>
                            );
                        })}
                        {classes.length > 3 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    tap();
                                    onViewClasses();
                                }}
                                className="text-[10px] font-bold uppercase tracking-wider
                                           px-2 py-1 rounded-lg
                                           bg-slate-100 dark:bg-white/[0.06]
                                           text-slate-600 dark:text-slate-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                +{classes.length - 3}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.04]
                            flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                    {isJoined ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold">Joined</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Zap className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold truncate">
                                {availableClasses.length} available
                            </span>
                        </div>
                    )}
                </div>

                {!isJoined && availableClasses.length > 0 && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            tap();
                            onViewClasses();
                        }}
                        className="h-8 px-3 rounded-lg bg-emerald-600 text-white
                                   text-[11px] font-bold
                                   active:scale-[0.97] transition-transform
                                   flex items-center gap-1.5"
                        style={{ touchAction: "manipulation" }}
                    >
                        <Eye className="w-3 h-3" />
                        View
                    </button>
                )}
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function TutorsList() {
    const user = useUser();
    const notificationSound = useRef<HTMLAudioElement | null>(null);
    const announcementsRef = useRef<HTMLDivElement | null>(null);

    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
    const [selectedClass, setSelectedClass] = useState<{
        block: string;
        year: number;
        semester: number;
        class_name?: string;
    } | null>(null);
    const [joining, setJoining] = useState(false);
    const [cohortMessages, setCohortMessages] = useState<Announcement[]>([]);
    const [existingCohorts, setExistingCohorts] = useState<Cohort[]>([]);
    const [leaveTarget, setLeaveTarget] = useState<Cohort | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [readMessages, setReadMessages] = useState<string[]>([]);
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const [error, setError] = useState<string | null>(null);

    const [classDetailsModalOpen, setClassDetailsModalOpen] = useState(false);
    const [selectedClassDetails, setSelectedClassDetails] = useState<TutorClass | null>(null);
    const [selectedTutorForDetails, setSelectedTutorForDetails] = useState<Tutor | null>(null);

    const isMounted = useRef(true);
    const backgroundRefreshInProgress = useRef(false);

    useEffect(() => {
        notificationSound.current = new Audio("/sounds/notification.mp3");
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    const fetchTutors = useCallback(
        async (forceRefresh = false) => {
            if (!user?.id) return [];
            const cached = getCachedData<Tutor[]>(TUTORS_CACHE_KEY);
            if (isCacheValid(cached, TUTORS_CACHE_DURATION) && !forceRefresh && isMounted.current) {
                setTutors(cached!.data);
                return cached!.data;
            }

            try {
                const { data: tutorsData, error: tutorsError } = await supabase
                    .from("profiles")
                    .select("user_id, name, username, specialization, avatar_url, bio, institution")
                    .eq("role", "tutor");

                if (tutorsError) {
                    setError("Error fetching tutors");
                    return [];
                }
                if (!tutorsData || tutorsData.length === 0) {
                    if (isMounted.current) setTutors([]);
                    return [];
                }

                const tutorIds = tutorsData.map((t) => t.user_id);
                const { data: classesData } = await supabase
                    .from("tutor_classes")
                    .select("*")
                    .in("tutor_id", tutorIds)
                    .eq("is_active", true);

                const classesByTutor: Record<string, TutorClass[]> = {};
                (classesData || []).forEach((cls: any) => {
                    if (!classesByTutor[cls.tutor_id]) classesByTutor[cls.tutor_id] = [];
                    classesByTutor[cls.tutor_id].push(cls);
                });

                const { data: studentsData } = await supabase
                    .from("tutor_students")
                    .select("tutor_id, block, year, semester, student_id")
                    .in("tutor_id", tutorIds);

                const studentCounts: Record<string, number> = {};
                (studentsData || []).forEach((entry: any) => {
                    const key = `${entry.tutor_id}-${entry.block}-${entry.year}-${entry.semester}`;
                    studentCounts[key] = (studentCounts[key] || 0) + 1;
                });

                const enhancedTutors: Tutor[] = tutorsData.map((tutor: any) => {
                    const tutorClasses = classesByTutor[tutor.user_id] || [];
                    return {
                        ...tutor,
                        classes: tutorClasses.map((cls) => {
                            const key = `${cls.tutor_id}-${cls.block}-${cls.year}-${cls.semester}`;
                            return { ...cls, student_count: studentCounts[key] || 0 };
                        }),
                    };
                });

                if (isMounted.current) {
                    setTutors(enhancedTutors);
                    setError(null);
                    saveCachedData(TUTORS_CACHE_KEY, enhancedTutors);
                }
                return enhancedTutors;
            } catch {
                setError("Failed to load tutors. Please try again.");
                if (cached?.data) {
                    if (isMounted.current) setTutors(cached.data);
                    return cached.data;
                }
                return [];
            }
        },
        [user?.id]
    );

    const fetchDashboardData = useCallback(
        async (forceRefresh = false): Promise<DashboardData | null> => {
            if (!user?.id) return null;
            const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
            if (isCacheValid(cached, DASHBOARD_CACHE_DURATION) && !forceRefresh && isMounted.current) {
                const d = cached!.data;
                setExistingCohorts(d.cohorts || []);
                setCohortMessages(d.announcements || []);
                setReadMessages(d.read_message_ids || []);
                setUnreadCount(
                    (d.announcements || []).filter(
                        (msg) => !(d.read_message_ids || []).includes(msg.id)
                    ).length
                );
                return d;
            }

            try {
                const { data, error } = await supabase.rpc("get_student_dashboard_data", {
                    p_student_id: user.id,
                });
                if (error) throw error;

                const dashboardData: DashboardData = {
                    cohorts: data?.cohorts || [],
                    announcements: data?.announcements || [],
                    read_message_ids: data?.read_message_ids || [],
                };

                if (isMounted.current) {
                    setExistingCohorts(dashboardData.cohorts);
                    setCohortMessages(dashboardData.announcements);
                    setReadMessages(dashboardData.read_message_ids);
                    setUnreadCount(
                        dashboardData.announcements.filter(
                            (msg) => !dashboardData.read_message_ids.includes(msg.id)
                        ).length
                    );
                    saveCachedData(DASHBOARD_CACHE_KEY, dashboardData);
                }
                return dashboardData;
            } catch {
                if (cached?.data && isMounted.current) {
                    const d = cached.data;
                    setExistingCohorts(d.cohorts || []);
                    setCohortMessages(d.announcements || []);
                    setReadMessages(d.read_message_ids || []);
                    setUnreadCount(
                        (d.announcements || []).filter(
                            (msg) => !(d.read_message_ids || []).includes(msg.id)
                        ).length
                    );
                    return d;
                }
                if (isMounted.current) {
                    setExistingCohorts([]);
                    setCohortMessages([]);
                    setReadMessages([]);
                    setUnreadCount(0);
                }
                return null;
            }
        },
        [user?.id]
    );

    useEffect(() => {
        if (!user?.id) return;
        isMounted.current = true;

        const initializeData = async () => {
            setLoading(true);
            try {
                await fetchDashboardData(false);
                await fetchTutors(false);
            } catch {
                /* silent */
            } finally {
                setLoading(false);
            }

            if (isOnline && !backgroundRefreshInProgress.current) {
                backgroundRefreshInProgress.current = true;
                try {
                    await fetchDashboardData(true);
                    await fetchTutors(true);
                } catch {
                    /* silent */
                } finally {
                    backgroundRefreshInProgress.current = false;
                }
            }
        };

        initializeData();
        return () => {
            isMounted.current = false;
        };
    }, [user?.id, isOnline]);

    const markMessageRead = useCallback(
        async (messageId: string) => {
            if (!messageId || !user?.id) return;
            setReadMessages((prev) => [...prev, messageId]);
            setUnreadCount((prev) => Math.max(prev - 1, 0));
            try {
                const { error } = await supabase.rpc("mark_message_read", {
                    p_student_id: user.id,
                    p_message_id: messageId,
                });
                if (error) throw error;
                const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
                if (cached) {
                    saveCachedData(DASHBOARD_CACHE_KEY, {
                        ...cached.data,
                        read_message_ids: [
                            ...(cached.data.read_message_ids || []),
                            messageId,
                        ],
                    });
                }
            } catch {
                setReadMessages((prev) => prev.filter((id) => id !== messageId));
                setUnreadCount((prev) => prev + 1);
            }
        },
        [user?.id]
    );

    const markAllRead = useCallback(async () => {
        if (!user?.id || cohortMessages.length === 0) return;
        const allIds = cohortMessages.map((msg) => msg.id);
        setReadMessages((prev) => [...new Set([...prev, ...allIds])]);
        setUnreadCount(0);
        try {
            const { error } = await supabase.rpc("mark_all_announcements_read", {
                p_student_id: user.id,
            });
            if (error) throw error;
            const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
            if (cached) {
                saveCachedData(DASHBOARD_CACHE_KEY, {
                    ...cached.data,
                    read_message_ids: [
                        ...new Set([...(cached.data.read_message_ids || []), ...allIds]),
                    ],
                });
            }
        } catch {
            const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
            if (cached) {
                setUnreadCount(
                    (cached.data.announcements || []).filter(
                        (msg) => !(cached.data.read_message_ids || []).includes(msg.id)
                    ).length
                );
                setReadMessages(cached.data.read_message_ids || []);
            }
        }
    }, [user?.id, cohortMessages]);

    useEffect(() => {
        if (!announcementsRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && unreadCount > 0) markAllRead();
            },
            { threshold: 0.6 }
        );
        observer.observe(announcementsRef.current);
        return () => observer.disconnect();
    }, [unreadCount, markAllRead]);

    const handleViewClasses = useCallback((tutor: Tutor) => {
        tap();
        setSelectedTutorForDetails(tutor);
        setSelectedClassDetails(tutor.classes?.[0] || null);
        setClassDetailsModalOpen(true);
    }, []);

    const handleClassClick = useCallback(
        (cls: { block: string; year: number; semester: number; class_name?: string }) => {
            const tutor = tutors.find((t) =>
                t.classes?.some(
                    (c) =>
                        c.block === cls.block &&
                        c.year === cls.year &&
                        c.semester === cls.semester
                )
            );
            if (tutor) {
                const fullClass = tutor.classes?.find(
                    (c) =>
                        c.block === cls.block &&
                        c.year === cls.year &&
                        c.semester === cls.semester
                );
                if (fullClass) {
                    setSelectedTutorForDetails(tutor);
                    setSelectedClassDetails(fullClass);
                    setClassDetailsModalOpen(true);
                    return;
                }
            }
            setSelectedClass(cls);
            if (tutor) setSelectedTutor(tutor);
        },
        [tutors]
    );

    const handleJoinFromModal = async (currentClass?: TutorClass) => {
        const classToJoin = currentClass || selectedClassDetails;
        if (!selectedTutorForDetails || !classToJoin) {
            toast.error("Please select a class to join");
            return;
        }
        const exists = existingCohorts.some(
            (c) =>
                c.tutor_id === selectedTutorForDetails.user_id &&
                c.block === classToJoin.block &&
                c.year === classToJoin.year &&
                c.semester === classToJoin.semester
        );
        if (exists) {
            toast.error("You are already in this class");
            return;
        }
        setJoining(true);
        try {
            const { error } = await supabase.from("tutor_students").insert({
                tutor_id: selectedTutorForDetails.user_id,
                student_id: user?.id,
                block: classToJoin.block,
                year: classToJoin.year,
                semester: classToJoin.semester,
            });
            if (error) throw error;
            toast.success(
                `Joined ${classToJoin.class_name || classToJoin.block}`
            );
            await fetchDashboardData(true);
            await fetchTutors(true);
            const updatedTutor = tutors.find(
                (t) => t.user_id === selectedTutorForDetails.user_id
            );
            const updatedClass = updatedTutor?.classes?.find(
                (c) =>
                    c.block === classToJoin.block &&
                    c.year === classToJoin.year &&
                    c.semester === classToJoin.semester
            );
            if (updatedClass) setSelectedClassDetails(updatedClass);
        } catch (err: any) {
            toast.error("Error joining class: " + err.message);
        } finally {
            setJoining(false);
        }
    };

    const handleJoinTutor = async () => {
        if (!selectedTutor || !selectedClass) {
            toast.error("Please select a class to join");
            return;
        }
        const exists = existingCohorts.some(
            (c) =>
                c.tutor_id === selectedTutor.user_id &&
                c.block === selectedClass.block &&
                c.year === selectedClass.year &&
                c.semester === selectedClass.semester
        );
        if (exists) {
            toast.error("You are already in this class");
            return;
        }
        setJoining(true);
        try {
            const { error } = await supabase.from("tutor_students").insert({
                tutor_id: selectedTutor.user_id,
                student_id: user?.id,
                block: selectedClass.block,
                year: selectedClass.year,
                semester: selectedClass.semester,
            });
            if (error) throw error;
            toast.success(
                `Joined ${selectedClass.class_name || selectedClass.block}`
            );
            await fetchDashboardData(true);
            await fetchTutors(true);
            setSelectedTutor(null);
            setSelectedClass(null);
        } catch (err: any) {
            toast.error("Error joining class: " + err.message);
        } finally {
            setJoining(false);
        }
    };

    const confirmLeave = async () => {
        if (!leaveTarget) return;
        tap("warning");
        try {
            const { error } = await supabase
                .from("tutor_students")
                .delete()
                .eq("student_id", user?.id)
                .eq("tutor_id", leaveTarget.tutor_id)
                .eq("block", leaveTarget.block)
                .eq("year", leaveTarget.year)
                .eq("semester", leaveTarget.semester);
            if (error) throw error;
            toast.success("Left the class");
            await fetchDashboardData(true);
            await fetchTutors(true);
        } catch (err: any) {
            toast.error("Error leaving class: " + err.message);
        } finally {
            setLeaveTarget(null);
        }
    };

    const joinedClassKeys = useMemo(
        () => existingCohorts.map((c) => `${c.block}-${c.year}-${c.semester}`),
        [existingCohorts]
    );

    const hasJoinedClassForTutor = useCallback(
        (tutorId: string) => existingCohorts.some((c) => c.tutor_id === tutorId),
        [existingCohorts]
    );

    return (
        <>
            <div className="space-y-3">
                {error && (
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3
                                    text-xs text-rose-700 dark:text-rose-300
                                    flex items-center justify-between">
                        <span>{error}</span>
                        <button
                            onClick={() => window.location.reload()}
                            className="font-bold underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Announcements */}
                {cohortMessages.length > 0 && (
                    <div ref={announcementsRef} className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                        <div className="flex items-center justify-between px-4 pt-4 pb-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                                    <Megaphone className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                                        Live updates
                                    </p>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Announcements
                                    </h3>
                                </div>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => {
                                        tap();
                                        markAllRead();
                                    }}
                                    className="text-[10px] font-bold uppercase tracking-wider
                                               text-blue-600 dark:text-blue-400
                                               px-2.5 py-1 rounded-full
                                               bg-blue-100 dark:bg-blue-400/10
                                               active:scale-[0.97] transition-transform"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    Mark read ({unreadCount})
                                </button>
                            )}
                        </div>
                        <div className="px-3 pb-3 space-y-2">
                            {cohortMessages.map((msg) => {
                                const isUnread = !readMessages.includes(msg.id);
                                return (
                                    <div
                                        key={msg.id}
                                        onClick={() => {
                                            tap();
                                            markMessageRead(msg.id);
                                        }}
                                        className={`rounded-xl p-3 cursor-pointer
                                                    ${isUnread
                                                ? "bg-blue-50 dark:bg-blue-400/10"
                                                : "bg-slate-50 dark:bg-[#0d1117]"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span
                                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                                                            ${isUnread
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                                                    }`}
                                            >
                                                {isUnread ? "New" : "Read"}
                                            </span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                {new Date(msg.created_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                                            {msg.message}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                                            Block {msg.block} · Year {msg.year} · Sem {msg.semester}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Main tutor card */}
                <div className="rounded-2xl bg-white dark:bg-[#161b22] overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                                <Users className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                                    Academic network
                                </p>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Discover your tutor
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full
                                                 bg-rose-100 dark:bg-rose-400/10 px-2 py-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                                        {unreadCount}
                                    </span>
                                </span>
                            )}
                            {existingCohorts.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full
                                                 bg-emerald-100 dark:bg-emerald-400/10 px-2 py-0.5">
                                    <CheckCircle className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                        {existingCohorts.length}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="px-3 pb-3">
                        {/* Active cohorts */}
                        {existingCohorts.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider
                                               text-slate-500 dark:text-slate-400
                                               px-1 mb-2 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    Active classes
                                </h4>
                                <div className="space-y-2">
                                    {existingCohorts.map((c, index) => {
                                        const tutor = tutors.find((t) => t.user_id === c.tutor_id);
                                        const classInfo = tutor?.classes?.find(
                                            (cls) =>
                                                cls.block === c.block &&
                                                cls.year === c.year &&
                                                cls.semester === c.semester
                                        );
                                        const className =
                                            classInfo?.class_name || `Block ${c.block}`;
                                        return (
                                            <div
                                                key={index}
                                                className="flex justify-between items-center p-3 rounded-xl
                                                           bg-emerald-50 dark:bg-emerald-400/[0.06]"
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="h-9 w-9 rounded-lg bg-emerald-600
                                                                    flex items-center justify-center
                                                                    text-xs font-bold text-white shrink-0">
                                                        {c.profiles?.name?.[0] || "T"}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                            {className}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                                {c.profiles?.name || "Tutor"}
                                                            </span>
                                                            <span className="mx-1">·</span>
                                                            B{c.block} Y{c.year} S{c.semester}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        tap("warning");
                                                        setLeaveTarget(c);
                                                    }}
                                                    className="h-8 px-3 rounded-lg shrink-0
                                                               text-[10px] font-bold uppercase tracking-wider
                                                               text-rose-600 dark:text-rose-400
                                                               bg-white dark:bg-white/[0.06]
                                                               active:scale-[0.97] transition-transform"
                                                    style={{ touchAction: "manipulation" }}
                                                >
                                                    Leave
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tutors */}
                        <div>
                            <div className="flex items-center justify-between px-1 mb-2">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    Available experts
                                </h4>
                                <span className="text-[10px] text-slate-400 tabular-nums">
                                    {tutors.length} found
                                </span>
                            </div>

                            {loading ? (
                                <div className="grid gap-2">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-4 h-24 animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : tutors.length === 0 ? (
                                <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-6 text-center">
                                    <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center">
                                        <Users className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        No tutors available yet
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Invite one to get started
                                    </p>
                                    <button
                                        onClick={() => {
                                            tap();
                                            setInviteModalOpen(true);
                                        }}
                                        className="mt-3 inline-flex items-center gap-1.5
                                                   rounded-xl bg-emerald-600 text-white
                                                   px-4 py-2 text-xs font-bold
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Invite a tutor
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {tutors.map((tutor) => {
                                        const isJoined = hasJoinedClassForTutor(tutor.user_id);
                                        return (
                                            <SmartTutorCard
                                                key={tutor.user_id}
                                                tutor={tutor}
                                                isJoined={isJoined}
                                                joinedClasses={joinedClassKeys}
                                                onJoin={() => setSelectedTutor(tutor)}
                                                onClassClick={handleClassClick}
                                                onViewClasses={() => handleViewClasses(tutor)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Inline join form */}
                        {selectedTutor && selectedClass && (
                            <div className="mt-3 rounded-2xl bg-emerald-50 dark:bg-emerald-400/[0.06] p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                                        <GraduationCap className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                            Join {selectedTutor.name}'s class
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {selectedClass.class_name ||
                                                `Block ${selectedClass.block} · Year ${selectedClass.year} · Sem ${selectedClass.semester}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            tap();
                                            setSelectedTutor(null);
                                            setSelectedClass(null);
                                        }}
                                        className="flex-1 h-10 rounded-xl bg-white dark:bg-white/[0.06]
                                                   text-slate-700 dark:text-slate-200
                                                   text-sm font-bold
                                                   active:scale-[0.97] transition-transform"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleJoinTutor}
                                        disabled={joining}
                                        className="flex-[2] h-10 rounded-xl bg-emerald-600 text-white
                                                   text-sm font-bold
                                                   active:scale-[0.97] transition-transform
                                                   flex items-center justify-center gap-1.5
                                                   disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        {joining ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Joining…
                                            </>
                                        ) : (
                                            "Join class"
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Class details modal */}
            <ClassDetailsModal
                isOpen={classDetailsModalOpen}
                onClose={() => {
                    setClassDetailsModalOpen(false);
                    setSelectedClassDetails(null);
                    setSelectedTutorForDetails(null);
                }}
                classData={selectedClassDetails}
                tutor={selectedTutorForDetails}
                onJoin={handleJoinFromModal}
                joining={joining}
                existingCohorts={existingCohorts}
            />

            {/* Leave confirmation */}
            <CenteredModal
                open={!!leaveTarget}
                onClose={() => setLeaveTarget(null)}
                title="Leave class"
                maxWidthClass="max-w-md"
                maxHeight="80vh"
            >
                <div className="px-5 py-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-400/10 rounded-2xl">
                            <Users className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            Leaving this class?
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            You'll stop receiving live updates from{" "}
                            <span className="font-bold text-slate-900 dark:text-white">
                                {leaveTarget?.profiles?.name || "this tutor"}
                            </span>
                            's class.
                        </p>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button
                            onClick={() => {
                                tap();
                                setLeaveTarget(null);
                            }}
                            className="flex-1 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06]
                                       text-slate-700 dark:text-slate-200
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Stay
                        </button>
                        <button
                            onClick={confirmLeave}
                            className="flex-1 h-10 rounded-xl bg-rose-600 text-white
                                       text-sm font-bold
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Leave
                        </button>
                    </div>
                </div>
            </CenteredModal>

            {/* Invite modal */}
            <CenteredModal
                open={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
                title="Invite a tutor"
                maxWidthClass="max-w-md"
                maxHeight="80vh"
            >
                <div className="px-5 py-4">
                    <div className="flex flex-col items-center text-center mb-5">
                        <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-400/10 rounded-2xl">
                            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Invite a tutor
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-[300px] leading-relaxed">
                            Send this to an expert so they can join and guide your cohort.
                        </p>
                    </div>

                    <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                            `Hello!

This platform helps students connect with knowledgeable tutors. By joining, you can guide students, answer questions, and post helpful announcements for your cohorts.

Steps to get started:
1. Sign up as a tutor on this platform.
2. Link your institution and specialization.
3. Create or join a cohort to start helping students.

Once added, students from your institution will be able to see you and join your cohorts.

Join the app here: https://medrae.vercel.app/`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mb-2"
                    >
                        <button
                            className="w-full h-11 rounded-xl bg-emerald-600 text-white
                                       text-sm font-bold
                                       active:scale-[0.98] transition-transform
                                       flex items-center justify-center gap-2"
                            style={{ touchAction: "manipulation" }}
                        >
                            Invite via WhatsApp
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </a>

                    <button
                        onClick={() => {
                            tap();
                            setInviteModalOpen(false);
                        }}
                        className="w-full h-10 rounded-xl
                                   text-xs font-bold uppercase tracking-wider
                                   text-slate-500 dark:text-slate-400
                                   active:bg-slate-100 dark:active:bg-white/5 transition-colors"
                        style={{ touchAction: "manipulation" }}
                    >
                        Maybe later
                    </button>
                </div>
            </CenteredModal>
        </>
    );
}