"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// TYPES
// ============================================

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
    profiles?: {
        name: string;
    };
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

// ============================================
// CACHE HELPERS
// ============================================

const TUTORS_CACHE_KEY = "student_tutors_with_classes_cache";
const DASHBOARD_CACHE_KEY = "dashboard_cache";
const TUTORS_CACHE_DURATION = 24 * 60 * 60 * 1000;
const DASHBOARD_CACHE_DURATION = 15 * 60 * 1000;

function getCachedData<T>(key: string): CachedData<T> | null {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        return JSON.parse(cached);
    } catch (_error) {
        return null;
    }
}

function saveCachedData<T>(key: string, data: T): void {
    try {
        const cacheData: CachedData<T> = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (_error) {
        // Silent fail
    }
}

function isCacheValid<T>(cached: CachedData<T> | null, duration: number): boolean {
    if (!cached) return false;
    return Date.now() - cached.timestamp < duration;
}

// ============================================
// CLASS DETAILS MODAL WITH NAVIGATION
// ============================================

const ClassDetailsModal = ({
    isOpen,
    onClose,
    classData,
    tutor,
    onJoin,
    joining,
    existingCohorts = []
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
            const index = classes.findIndex(
                c => c.id === classData.id
            );
            setCurrentClassIndex(index >= 0 ? index : 0);
        }
    }, [isOpen, classData, classes]);

    if (!classData || !tutor || classes.length === 0) return null;

    const currentClass = classes[currentClassIndex] || classData;

    const handlePrevious = () => {
        setCurrentClassIndex(prev => (prev > 0 ? prev - 1 : classes.length - 1));
    };

    const handleNext = () => {
        setCurrentClassIndex(prev => (prev < classes.length - 1 ? prev + 1 : 0));
    };

    const getIsCurrentClassJoined = () => {
        return existingCohorts?.some(c =>
            c.tutor_id === tutor.user_id &&
            c.block === currentClass.block &&
            c.year === currentClass.year &&
            c.semester === currentClass.semester
        ) || false;
    };

    const isCurrentClassJoined = getIsCurrentClassJoined();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] border-0 bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-none max-h-[100vh] overflow-y-auto hide-scrollbar w-full mx-0">
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 flex-shrink-0" />

                <div className="p-4 sm:p-6 pb-8 sm:pb-10">
                    {/* Tutor Info - Fixed layout */}
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-12 h-12 ring-2 ring-blue-500/20 flex-shrink-0">
                            {tutor.avatar_url ? (
                                <AvatarImage src={tutor.avatar_url} className="object-cover" />
                            ) : (
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-lg font-bold">
                                    {tutor.name?.[0] || "T"}
                                </AvatarFallback>
                            )}
                        </Avatar>
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <p className="text-[8px] uppercase tracking-[2px] font-bold text-slate-400 dark:text-slate-500">
                                Tutor
                            </p>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                {tutor.name}
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {tutor.specialization || "General Expert"}
                            </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {currentClassIndex + 1}/{classes.length}
                            </p>
                        </div>
                    </div>

                    {/* Class Navigation - Fixed with truncation */}
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={handlePrevious}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-50 flex-shrink-0"
                            disabled={classes.length <= 1}
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>

                        <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5">
                                <School className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">
                                    {currentClass.class_name || `Block ${currentClass.block}`}
                                </h2>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1.5 mt-0.5">
                                <span className="text-[8px] px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-bold">
                                    B{currentClass.block}
                                </span>
                                <span className="text-[8px] px-2 py-0.5 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full font-bold">
                                    Y{currentClass.year}
                                </span>
                                <span className="text-[8px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-bold">
                                    S{currentClass.semester}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleNext}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-50 flex-shrink-0"
                            disabled={classes.length <= 1}
                        >
                            <ArrowRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                    </div>

                    {/* Dot indicators */}
                    {classes.length > 1 && (
                        <div className="flex justify-center gap-1 mb-3">
                            {classes.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentClassIndex(idx)}
                                    className={`h-1 rounded-full transition-all ${idx === currentClassIndex
                                        ? 'w-4 bg-blue-500'
                                        : 'w-1 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Description - Edge to edge with negative margin */}
                    {currentClass.description && (
                        <div className="mb-4 -mx-4 sm:-mx-6">
                            <div className="px-4 sm:px-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex-shrink-0">
                                        <Info className="w-3 h-3 text-white" />
                                    </div>
                                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                        Description
                                    </p>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-white/5 dark:to-white/5 border-y border-slate-200/50 dark:border-white/5 px-4 sm:px-6 py-3">
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                    {currentClass.description}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stats Grid - Fixed sizes */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="p-2 bg-blue-50/50 dark:bg-blue-500/5 rounded-lg border-0 min-w-0">
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Created</p>
                            <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate">
                                {new Date(currentClass.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="p-2 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-lg border-0">
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Status</p>
                            <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                                <span className="truncate">{currentClass.is_active ? 'Active' : 'Inactive'}</span>
                            </p>
                        </div>
                        {currentClass.student_count !== undefined && (
                            <div className="p-2 bg-violet-50/50 dark:bg-violet-500/5 rounded-lg border-0">
                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Students</p>
                                <p className="text-[10px] font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1">
                                    <Users className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{currentClass.student_count}</span>
                                </p>
                            </div>
                        )}
                        {currentClass.max_students && (
                            <div className="p-2 bg-amber-50/50 dark:bg-amber-500/5 rounded-lg border-0">
                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Capacity</p>
                                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <UserPlus className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">Max {currentClass.max_students}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border-0 h-9"
                        >
                            Close
                        </Button>
                        {!isCurrentClassJoined ? (
                            <Button
                                onClick={() => onJoin(currentClass)}
                                disabled={joining}
                                className="flex-[2] bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 border-0 h-9"
                            >
                                {joining ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Joining...
                                    </span>
                                ) : (
                                    "Join Class"
                                )}
                            </Button>
                        ) : (
                            <Button
                                disabled
                                className="flex-[2] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-widest rounded-lg cursor-default border-0 h-9"
                            >
                                Joined ✓
                            </Button>
                        )}
                    </div>

                    {/* Other Classes - Fixed with truncation */}
                    {classes.length > 1 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                                Other Classes
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {classes.map((cls, idx) => {
                                    const isThisJoined = existingCohorts?.some(c =>
                                        c.tutor_id === tutor.user_id &&
                                        c.block === cls.block &&
                                        c.year === cls.year &&
                                        c.semester === cls.semester
                                    ) || false;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentClassIndex(idx)}
                                            className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-all max-w-[120px] truncate ${idx === currentClassIndex
                                                ? 'bg-blue-500 text-white'
                                                : isThisJoined
                                                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                                }`}
                                            title={cls.class_name || `Block ${cls.block}`}
                                        >
                                            {cls.class_name || `B${cls.block}`}
                                            {isThisJoined && ' ✓'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Bottom spacer for safe area on phones */}
                    <div className="h-4 sm:h-6" />
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ============================================
// SMART TUTOR CARD COMPONENT
// ============================================

const SmartTutorCard = ({
    tutor,
    onClassClick,
    onViewClasses,
    isJoined,
    joinedClasses
}: {
    tutor: Tutor;
    onJoin: () => void;
    onClassClick: (cls: { block: string; year: number; semester: number; class_name?: string }) => void;
    onViewClasses: () => void;
    isJoined: boolean;
    joinedClasses: string[];
}) => {
    const [isHovered, setIsHovered] = useState(false);

    const classes = tutor.classes || [];
    const availableClasses = classes.filter(c => !joinedClasses.includes(`${c.block}-${c.year}-${c.semester}`));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            className={`relative group cursor-pointer transition-all duration-300 border-0 p-4 w-full ${isJoined
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10'
                : 'bg-white dark:bg-slate-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-500/5'
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                    <Avatar className={`w-14 h-14 ring-2 ${isJoined
                        ? 'ring-emerald-500/30'
                        : isHovered
                            ? 'ring-blue-500/30 scale-105'
                            : 'ring-slate-200 dark:ring-white/10'
                        } transition-all duration-300`}>
                        {tutor.avatar_url ? (
                            <AvatarImage src={tutor.avatar_url} className="object-cover" />
                        ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl font-bold">
                                {tutor.name?.[0] || "T"}
                            </AvatarFallback>
                        )}
                    </Avatar>

                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words whitespace-normal">
                            {tutor.name || "Unknown Tutor"}
                        </h3>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                            @{tutor.username || "expert"}
                        </span>
                        <span className="text-[8px] text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                            {tutor.specialization || "General Expert"}
                        </span>
                        {tutor.institution && (
                            <>
                                <span className="text-[8px] text-slate-400 dark:text-slate-500">•</span>
                                <span className="text-[9px] flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <Building2 className="w-3 h-3" />
                                    {tutor.institution}
                                </span>
                            </>
                        )}
                    </div>

                    {tutor.bio && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                            {tutor.bio}
                        </p>
                    )}

                    {classes.length > 0 && (
                        <div className="mt-2.5">
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <School className="w-3 h-3" />
                                Available Classes ({classes.length})
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
                                                    onClassClick({
                                                        block: cls.block,
                                                        year: cls.year,
                                                        semester: cls.semester,
                                                        class_name: cls.class_name
                                                    });
                                                }
                                            }}
                                            disabled={isThisClassJoined}
                                            className={`text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-all ${isThisClassJoined
                                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 cursor-default'
                                                : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:scale-105 transition-transform'
                                                }`}
                                        >
                                            {isThisClassJoined ? 'Joined' : ` ${cls.class_name || `B${cls.block}`}`}
                                        </button>
                                    );
                                })}
                                {classes.length > 3 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewClasses();
                                        }}
                                        className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                    >
                                        +{classes.length - 3}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {isJoined ? (
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">Joined</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 animate-pulse">
                            <Zap className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{availableClasses.length} classes available</span>
                        </div>
                    )}
                </div>

                {!isJoined && availableClasses.length > 0 && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white flex items-center gap-1.5"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewClasses();
                        }}
                    >
                        <Eye className="w-3 h-3" />
                        View Classes
                    </motion.button>
                )}

                {isJoined && (
                    <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">
                        Active Member
                    </span>
                )}
            </div>
        </motion.div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TutorsList() {
    const user = useUser();
    const notificationSound = useRef<HTMLAudioElement | null>(null);
    const announcementsRef = useRef<HTMLDivElement | null>(null);

    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
    const [selectedClass, setSelectedClass] = useState<{ block: string; year: number; semester: number; class_name?: string } | null>(null);
    const [joining, setJoining] = useState(false);
    const [cohortMessages, setCohortMessages] = useState<Announcement[]>([]);
    const [existingCohorts, setExistingCohorts] = useState<Cohort[]>([]);
    const [leaveTarget, setLeaveTarget] = useState<Cohort | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [readMessages, setReadMessages] = useState<string[]>([]);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
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

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    const fetchTutors = useCallback(async (forceRefresh = false) => {
        if (!user?.id) {
            return [];
        }

        const cached = getCachedData<Tutor[]>(TUTORS_CACHE_KEY);
        const cacheValid = isCacheValid(cached, TUTORS_CACHE_DURATION);

        if (cacheValid && !forceRefresh && isMounted.current) {
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

            const tutorIds = tutorsData.map(t => t.user_id);
            const { data: classesData, error: classesError } = await supabase
                .from("tutor_classes")
                .select("*")
                .in("tutor_id", tutorIds)
                .eq("is_active", true);

            if (classesError) {
                // Silent fail
            }

            const classesByTutor: Record<string, TutorClass[]> = {};
            (classesData || []).forEach((cls) => {
                if (!classesByTutor[cls.tutor_id]) {
                    classesByTutor[cls.tutor_id] = [];
                }
                classesByTutor[cls.tutor_id].push(cls);
            });

            const { data: studentsData, error: studentsError } = await supabase
                .from("tutor_students")
                .select("tutor_id, block, year, semester, student_id")
                .in("tutor_id", tutorIds);

            let studentCounts: Record<string, number> = {};
            if (!studentsError && studentsData) {
                studentsData.forEach((entry) => {
                    const key = `${entry.tutor_id}-${entry.block}-${entry.year}-${entry.semester}`;
                    if (!studentCounts[key]) {
                        studentCounts[key] = 0;
                    }
                    studentCounts[key]++;
                });
            }

            const enhancedTutors: Tutor[] = tutorsData.map((tutor) => {
                const tutorClasses = classesByTutor[tutor.user_id] || [];

                const classesWithCounts = tutorClasses.map(cls => {
                    const key = `${cls.tutor_id}-${cls.block}-${cls.year}-${cls.semester}`;
                    return {
                        ...cls,
                        student_count: studentCounts[key] || 0
                    };
                });

                return {
                    user_id: tutor.user_id,
                    name: tutor.name,
                    username: tutor.username,
                    specialization: tutor.specialization,
                    avatar_url: tutor.avatar_url,
                    bio: tutor.bio,
                    institution: tutor.institution,
                    classes: classesWithCounts
                };
            });

            if (isMounted.current) {
                setTutors(enhancedTutors);
                setError(null);
                saveCachedData(TUTORS_CACHE_KEY, enhancedTutors);
            }

            return enhancedTutors;
        } catch (_error) {
            setError("Failed to load tutors. Please try again.");

            if (cached?.data) {
                if (isMounted.current) setTutors(cached.data);
                return cached.data;
            }
            return [];
        }
    }, [user?.id]);

    const fetchDashboardData = useCallback(async (forceRefresh = false): Promise<DashboardData | null> => {
        if (!user?.id) return null;

        const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
        const cacheValid = isCacheValid(cached, DASHBOARD_CACHE_DURATION);

        if (cacheValid && !forceRefresh && isMounted.current) {
            const dashboardData = cached!.data;
            setExistingCohorts(dashboardData.cohorts || []);
            setCohortMessages(dashboardData.announcements || []);
            setReadMessages(dashboardData.read_message_ids || []);

            const unread = (dashboardData.announcements || []).filter(
                msg => !(dashboardData.read_message_ids || []).includes(msg.id)
            ).length;
            setUnreadCount(unread);

            return dashboardData;
        }

        try {
            const { data, error } = await supabase.rpc('get_student_dashboard_data', {
                p_student_id: user.id
            });

            if (error) throw error;

            const dashboardData: DashboardData = {
                cohorts: data?.cohorts || [],
                announcements: data?.announcements || [],
                read_message_ids: data?.read_message_ids || []
            };

            if (isMounted.current) {
                setExistingCohorts(dashboardData.cohorts);
                setCohortMessages(dashboardData.announcements);
                setReadMessages(dashboardData.read_message_ids);

                const unread = dashboardData.announcements.filter(
                    msg => !dashboardData.read_message_ids.includes(msg.id)
                ).length;
                setUnreadCount(unread);

                saveCachedData(DASHBOARD_CACHE_KEY, dashboardData);
            }

            return dashboardData;
        } catch (_error) {
            if (cached?.data && isMounted.current) {
                const dashboardData = cached.data;
                setExistingCohorts(dashboardData.cohorts || []);
                setCohortMessages(dashboardData.announcements || []);
                setReadMessages(dashboardData.read_message_ids || []);
                const unread = (dashboardData.announcements || []).filter(
                    msg => !(dashboardData.read_message_ids || []).includes(msg.id)
                ).length;
                setUnreadCount(unread);
                return dashboardData;
            }

            if (isMounted.current) {
                setExistingCohorts([]);
                setCohortMessages([]);
                setReadMessages([]);
                setUnreadCount(0);
            }
            return null;
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) {
            return;
        }

        isMounted.current = true;

        const initializeData = async () => {
            setLoading(true);

            try {
                await fetchDashboardData(false);
                await fetchTutors(false);
            } catch (_error) {
                // Silent fail
            } finally {
                setLoading(false);
            }

            if (isOnline && !backgroundRefreshInProgress.current) {
                backgroundRefreshInProgress.current = true;
                try {
                    await fetchDashboardData(true);
                    await fetchTutors(true);
                } catch (_error) {
                    // Silent fail
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

    const markMessageRead = useCallback(async (messageId: string) => {
        if (!messageId || !user?.id) return;

        setReadMessages(prev => [...prev, messageId]);
        setUnreadCount(prev => Math.max(prev - 1, 0));

        try {
            const { error } = await supabase.rpc('mark_message_read', {
                p_student_id: user.id,
                p_message_id: messageId
            });

            if (error) throw error;

            const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
            if (cached) {
                const updatedReadIds = [...(cached.data.read_message_ids || []), messageId];
                const updatedDashboard = {
                    ...cached.data,
                    read_message_ids: updatedReadIds
                };
                saveCachedData(DASHBOARD_CACHE_KEY, updatedDashboard);
            }
        } catch (_error) {
            setReadMessages(prev => prev.filter(id => id !== messageId));
            setUnreadCount(prev => prev + 1);
        }
    }, [user?.id]);

    const markAllRead = useCallback(async () => {
        if (!user?.id || cohortMessages.length === 0) return;

        const allMessageIds = cohortMessages.map(msg => msg.id);
        setReadMessages(prev => [...new Set([...prev, ...allMessageIds])]);
        setUnreadCount(0);

        try {
            const { error } = await supabase.rpc('mark_all_announcements_read', {
                p_student_id: user.id
            });

            if (error) throw error;

            const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
            if (cached) {
                const updatedReadIds = [...new Set([...(cached.data.read_message_ids || []), ...allMessageIds])];
                const updatedDashboard = {
                    ...cached.data,
                    read_message_ids: updatedReadIds
                };
                saveCachedData(DASHBOARD_CACHE_KEY, updatedDashboard);
            }
        } catch (_error) {
            const cached = getCachedData<DashboardData>(DASHBOARD_CACHE_KEY);
            if (cached) {
                const unread = (cached.data.announcements || []).filter(
                    msg => !(cached.data.read_message_ids || []).includes(msg.id)
                ).length;
                setUnreadCount(unread);
                setReadMessages(cached.data.read_message_ids || []);
            }
        }
    }, [user?.id, cohortMessages]);

    useEffect(() => {
        if (!announcementsRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && unreadCount > 0) {
                    markAllRead();
                }
            },
            { threshold: 0.6 }
        );

        observer.observe(announcementsRef.current);

        return () => observer.disconnect();
    }, [unreadCount, markAllRead]);

    const handleViewClasses = useCallback((tutor: Tutor) => {
        setSelectedTutorForDetails(tutor);
        const firstClass = tutor.classes?.[0] || null;
        setSelectedClassDetails(firstClass);
        setClassDetailsModalOpen(true);
    }, []);

    const handleClassClick = useCallback((cls: { block: string; year: number; semester: number; class_name?: string }) => {
        const tutor = tutors.find(t =>
            t.classes?.some(c =>
                c.block === cls.block &&
                c.year === cls.year &&
                c.semester === cls.semester
            )
        );

        if (tutor) {
            const fullClass = tutor.classes?.find(c =>
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
        if (tutor) {
            setSelectedTutor(tutor);
        }
        setTimeout(() => {
            const formElement = document.getElementById('join-form');
            if (formElement) {
                formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }, [tutors]);

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
            toast.error("You are already in this class!");
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

            toast.success(`Successfully joined ${classToJoin.class_name || classToJoin.block}!`);

            await fetchDashboardData(true);
            await fetchTutors(true);

            const updatedTutor = tutors.find(t => t.user_id === selectedTutorForDetails.user_id);
            const updatedClass = updatedTutor?.classes?.find(
                c => c.block === classToJoin.block &&
                    c.year === classToJoin.year &&
                    c.semester === classToJoin.semester
            );

            if (updatedClass) {
                setSelectedClassDetails(updatedClass);
            }

        } catch (error: any) {
            toast.error("Error joining class: " + error.message);
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
            toast.error("You are already in this class!");
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

            toast.success(`Successfully joined ${selectedClass.class_name || selectedClass.block}!`);

            await fetchDashboardData(true);
            await fetchTutors(true);

            setSelectedTutor(null);
            setSelectedClass(null);
        } catch (error: any) {
            toast.error("Error joining class: " + error.message);
        } finally {
            setJoining(false);
        }
    };

    const confirmLeave = async () => {
        if (!leaveTarget) return;

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

            toast.success("Successfully left the cohort");
            await fetchDashboardData(true);
            await fetchTutors(true);
        } catch (error: any) {
            toast.error("Error leaving cohort: " + error.message);
        } finally {
            setLeaveTarget(null);
        }
    };

    const unreadCountDisplay = useMemo(() => unreadCount, [unreadCount]);

    const joinedClassKeys = useMemo(() =>
        existingCohorts.map(c => `${c.block}-${c.year}-${c.semester}`),
        [existingCohorts]
    );

    const hasJoinedClassForTutor = useCallback((tutorId: string) => {
        return existingCohorts.some(c => c.tutor_id === tutorId);
    }, [existingCohorts]);

    return (
        <div className="animate-fade-in max-w-full mx-0 px-0 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-red-600 dark:text-red-400 text-sm mx-0">
                    {error}
                    <button
                        onClick={() => window.location.reload()}
                        className="ml-2 text-xs font-bold underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {cohortMessages.length > 0 && (
                <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-none rounded-none mb-0">
                    <CardHeader className="border-b border-slate-200/30 dark:border-white/5 px-4 py-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                                    <Megaphone className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[2px] font-bold text-blue-600/70 dark:text-blue-400/70">Live Updates</p>
                                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Cohort Announcements</CardTitle>
                                </div>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 hover:opacity-70 transition-opacity px-3 py-1.5 bg-blue-500/10 rounded-lg"
                                >
                                    Mark All Read ({unreadCount})
                                </button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-2 space-y-2 px-4 pb-2" ref={announcementsRef}>
                        {cohortMessages.map((msg) => {
                            const isUnread = !readMessages.includes(msg.id);
                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`group relative p-4 rounded-lg transition-all cursor-pointer border-0 ${isUnread
                                        ? "bg-white dark:bg-slate-900/80"
                                        : "bg-slate-50/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
                                        }`}
                                    onClick={() => markMessageRead(msg.id)}
                                >
                                    {isUnread && (
                                        <div className="absolute -left-0.5 top-4 w-1.5 h-10 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full animate-pulse" />
                                    )}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-tighter px-2.5 py-0.5 rounded ${isUnread
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                            {isUnread ? "New" : "Read"}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                                            {new Date(msg.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed mb-3 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                                        {msg.message}
                                    </p>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Block {msg.block} • Year {msg.year} • Semester {msg.semester}
                                        </div>
                                        {isUnread && (
                                            <div className="flex items-center gap-1 text-blue-500">
                                                <span className="text-[8px] font-bold uppercase">Click to mark read</span>
                                                <ArrowUpRight className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            <div>
                <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-900/95 backdrop-blur-none rounded-none mb-0">
                    <CardHeader className="border-b border-slate-200/50 dark:border-white/5 pb-2 px-4">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[2px] font-bold text-emerald-600/70 dark:text-emerald-400/70">Academic Network</p>
                                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Discover Your Tutor</CardTitle>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-full">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                        </span>
                                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">{unreadCountDisplay} New</span>
                                    </div>
                                )}
                                {existingCohorts.length > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
                                        {existingCohorts.length} Active Classes
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-4 px-4">
                        {existingCohorts.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                    Your Active Classes
                                </h3>
                                <div className="grid gap-3">
                                    {existingCohorts.map((c, index) => {
                                        const tutor = tutors.find(t => t.user_id === c.tutor_id);
                                        const classInfo = tutor?.classes?.find(
                                            cls => cls.block === c.block &&
                                                cls.year === c.year &&
                                                cls.semester === c.semester
                                        );
                                        const className = classInfo?.class_name || `Block ${c.block}`;

                                        return (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-500/5 dark:to-teal-500/5 rounded-lg hover:bg-emerald-100/50 transition-all group border-0"
                                            >
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                                                        {c.profiles?.name?.[0] || "T"}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white break-words">
                                                            {className}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                                {c.profiles?.name || "Tutor"}
                                                            </span>
                                                            <span className="mx-1">•</span>
                                                            <span>Block {c.block}</span>
                                                            <span className="mx-1">•</span>
                                                            <span>Year {c.year}</span>
                                                            <span className="mx-1">•</span>
                                                            <span>Sem {c.semester}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setLeaveTarget(c)}
                                                    className="h-8 text-[10px] font-bold uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-400/10 transition-all border-0 flex-shrink-0"
                                                >
                                                    Leave
                                                </Button>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <Sparkles className="w-3 h-3 text-yellow-500" />
                                    Available Experts
                                </h3>
                                <span className="text-[10px] text-slate-400">{tutors.length} tutors found</span>
                            </div>

                            {loading ? (
                                <div className="grid gap-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="p-6 border-0 rounded-none animate-pulse bg-white dark:bg-slate-800/30">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-full" />
                                                <div className="flex-1 space-y-3">
                                                    <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
                                                    <div className="h-3 bg-slate-100 dark:bg-white/5 rounded w-1/2" />
                                                    <div className="h-10 bg-slate-100 dark:bg-white/5 rounded w-full" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : tutors.length === 0 ? (
                                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="p-4 bg-slate-100 dark:bg-white/5 rounded-full">
                                            <Users className="w-12 h-12 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No tutors available at your institution yet.</p>
                                            <p className="text-xs text-slate-400 mt-1">Be the first to invite one!</p>
                                        </div>
                                        <Button
                                            onClick={() => setInviteModalOpen(true)}
                                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg border-0"
                                        >
                                            Invite a Tutor
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-1">
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

                        {selectedTutor && selectedClass && (
                            <motion.div
                                id="join-form"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="mt-1 p-6 border-0 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-lg"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                                        <GraduationCap className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">
                                            Join {selectedTutor.name}'s Class
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {selectedClass.class_name || `Block ${selectedClass.block} • Year ${selectedClass.year} • Semester ${selectedClass.semester}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="p-3 bg-white/50 dark:bg-white/5 rounded-lg border-0">
                                        <div className="flex items-center gap-2 text-sm">
                                            <School className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            <span className="text-slate-700 dark:text-slate-300 break-words">
                                                {selectedClass.class_name || `Block ${selectedClass.block}`}
                                            </span>
                                            <span className="text-slate-400">•</span>
                                            <span className="text-slate-500 text-xs flex-shrink-0">
                                                Y{selectedClass.year} S{selectedClass.semester}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setSelectedTutor(null);
                                                setSelectedClass(null);
                                            }}
                                            className="flex-1 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border-0"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleJoinTutor}
                                            disabled={joining}
                                            className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 border-0"
                                        >
                                            {joining ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Joining...
                                                </span>
                                            ) : (
                                                " Join Class"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </div>

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

            <Dialog open={!!leaveTarget} onOpenChange={() => setLeaveTarget(null)}>
                <DialogContent className="sm:max-w-[420px] border-0 bg-white dark:bg-slate-900 p-0 overflow-hidden rounded-none w-full mx-0">
                    <div className="h-1 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
                    <div className="p-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-full">
                                <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full text-red-600 dark:text-red-500 animate-pulse">
                                    <Users className="w-8 h-8" />
                                </div>
                            </div>
                            <DialogHeader className="space-y-2">
                                <p className="text-[10px] uppercase tracking-[3px] font-bold text-red-500 dark:text-red-400">
                                    Departure Confirmation
                                </p>
                                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                    Leaving this class?
                                </DialogTitle>
                            </DialogHeader>
                            <div className="mt-1">
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    You are about to disconnect from <span className="font-bold text-slate-900 dark:text-slate-200">
                                        {leaveTarget?.profiles?.name || "this tutor"}'s</span> class.
                                    You will no longer receive live updates or announcements.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 mt-1">
                            <Button
                                variant="ghost"
                                onClick={() => setLeaveTarget(null)}
                                className="flex-1 order-2 sm:order-1 font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all border-0"
                            >
                                Stay in Class
                            </Button>
                            <Button
                                onClick={confirmLeave}
                                className="flex-1 order-1 sm:order-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-xs uppercase tracking-widest py-6 transition-all border-0"
                            >
                                Confirm Leave
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
                <DialogContent className="sm:max-w-[520px] border-0 bg-white dark:bg-slate-900/95 p-0 overflow-hidden rounded-none w-full mx-0">
                    <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
                    <div className="p-8">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="mb-4 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-2xl">
                                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <DialogHeader className="space-y-1">
                                <p className="text-[10px] uppercase tracking-[3px] font-bold text-emerald-600 dark:text-emerald-500">
                                    Community Growth
                                </p>
                                <DialogTitle className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Invite a Tutor
                                </DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-[320px]">
                                Expand your learning circle. Invite experts to guide your cohort and share vital updates.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            {[
                                { step: "01", label: "Copy link" },
                                { step: "02", label: "Open WhatsApp" },
                                { step: "03", label: "Send Invite" }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center space-y-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5">
                                        {item.step}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter leading-tight">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="relative group bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/[0.03] dark:to-white/[0.01] border border-slate-200 dark:border-white/5 rounded-2xl p-5 mb-6">
                            <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase">
                                Message Preview
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic line-clamp-4">
                                "Hello! This platform helps students connect with knowledgeable tutors. By joining, you can guide students, answer questions, and post helpful announcements..."
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 truncate flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    medrae.vercel.app
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] text-slate-400">Powered by</span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
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
                                className="w-full"
                            >
                                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-[1px] py-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-0">
                                    Invite via WhatsApp
                                    <ArrowUpRight className="w-4 h-4" />
                                </Button>
                            </a>

                            <Button
                                variant="ghost"
                                onClick={() => setInviteModalOpen(false)}
                                className="w-full text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 border-0"
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}