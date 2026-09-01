// src/pages/live-classes/MyClasses.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { registrationService } from '@/services/liveClassService';
import { toast } from 'sonner';
import {
    Calendar, Clock, Users, Video, Award, CheckCircle,
    XCircle, Clock as ClockIcon, AlertCircle, ArrowRight
} from 'lucide-react';

// Skeleton Loader Component
const MyClassesSkeleton = () => {
    return (
        <div className="container mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 max-w-full animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-4 md:mb-8 px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0">
                <div className="space-y-2">
                    <div className="h-8 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-36 md:w-48"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 md:w-64"></div>
                </div>
                <div className="h-9 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 md:w-40"></div>
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8 px-4 md:px-0">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4">
                        <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 md:w-20 mb-2"></div>
                        <div className="h-6 md:h-8 bg-gray-200 dark:bg-gray-700 rounded w-8 md:w-12"></div>
                    </div>
                ))}
            </div>

            {/* Filters Skeleton */}
            <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6 px-4 md:px-0">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-16 md:w-20"></div>
                ))}
            </div>

            {/* Cards Skeleton - Updated grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 px-0 md:px-0">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl overflow-hidden">
                        <div className="h-40 md:h-48 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="p-4 md:p-6 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="h-5 md:h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="h-5 md:h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                                <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                                <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                            </div>
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                            </div>
                            <div className="h-9 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MyClasses = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadData();
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await registrationService.getUserRegistrations();
            setRegistrations(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load your classes');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string, classStatus: string) => {
        if (classStatus === 'cancelled') {
            return (
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-semibold bg-red-100 text-red-800">
                    CANCELLED
                </span>
            );
        }

        if (status === 'attended') {
            return (
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-0.5 md:gap-1">
                    <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    COMPLETED
                </span>
            );
        }

        if (status === 'missed') {
            return (
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-0.5 md:gap-1">
                    <XCircle className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    MISSED
                </span>
            );
        }

        if (classStatus === 'live') {
            return (
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-semibold bg-green-100 text-green-800 animate-pulse flex items-center gap-0.5 md:gap-1">
                    <AlertCircle className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    LIVE NOW
                </span>
            );
        }

        if (classStatus === 'upcoming') {
            return (
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-0.5 md:gap-1">
                    <ClockIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    UPCOMING
                </span>
            );
        }

        return (
            <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-semibold bg-gray-100 text-gray-800">
                {status?.toUpperCase() || 'REGISTERED'}
            </span>
        );
    };

    const getAttendanceStatus = (registration: any) => {
        if (registration.attendance_status === 'attended') {
            return { text: 'Attended', color: 'text-green-600', icon: CheckCircle };
        }
        if (registration.attendance_status === 'missed') {
            return { text: 'Missed', color: 'text-red-600', icon: XCircle };
        }
        if (registration.class?.status === 'completed') {
            return { text: 'No Show', color: 'text-red-500', icon: XCircle };
        }
        if (registration.class?.status === 'live' || registration.class?.status === 'upcoming') {
            return { text: 'Pending', color: 'text-yellow-600', icon: ClockIcon };
        }
        return { text: 'Registered', color: 'text-blue-600', icon: CheckCircle };
    };

    const filteredRegistrations = registrations.filter((reg: any) => {
        if (filter === 'all') return true;
        if (filter === 'upcoming') {
            return reg.class?.status === 'upcoming' || reg.class?.status === 'live';
        }
        if (filter === 'past') {
            return reg.class?.status === 'completed' || reg.class?.status === 'cancelled';
        }
        return true;
    });

    const upcomingCount = registrations.filter((r: any) =>
        r.class?.status === 'upcoming' || r.class?.status === 'live'
    ).length;

    const pastCount = registrations.filter((r: any) =>
        r.class?.status === 'completed' || r.class?.status === 'cancelled'
    ).length;

    const attendedCount = registrations.filter((r: any) =>
        r.attendance_status === 'attended'
    ).length;

    // Show skeleton loader on first load
    if (loading) {
        return <MyClassesSkeleton />;
    }

    return (
        // ✅ CHANGED: Removed max-w-2xl, added full width
        <div className="container mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 max-w-full">
            {/* Header - Mobile Native */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-4 md:mb-8 px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0 border-b md:border-b-0 border-gray-200/50 dark:border-gray-800/50">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Sessions</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 md:mt-1">
                        Track your registered classes and attendance
                    </p>
                </div>
                <button
                    onClick={() => navigate('/live-classes')}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] md:text-sm font-medium transition-colors flex items-center gap-1.5 md:gap-2"
                >
                    <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    Browse More Classes
                </button>
            </div>

            {/* Stats - Mobile Native */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8 px-4 md:px-0">
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Total Registered</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{registrations.length}</p>
                </div>
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Upcoming</p>
                    <p className="text-xl md:text-2xl font-bold text-blue-600">{upcomingCount}</p>
                </div>
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Completed</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600">{attendedCount}</p>
                </div>
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0 md:border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Past Classes</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-600">{pastCount}</p>
                </div>
            </div>

            {/* Filters - Mobile Native */}
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6 px-4 md:px-0">
                {['all', 'upcoming', 'past'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium transition-all ${filter === status
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* ✅ CHANGED: Class Cards - Grid with more columns on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 md:gap-4 lg:gap-6 px-0 md:px-0">
                {filteredRegistrations.map((reg: any, index: number) => {
                    const cls = reg.class;
                    const attendance = getAttendanceStatus(reg);
                    const isUpcoming = cls?.status === 'upcoming' || cls?.status === 'live';
                    const isLive = cls?.status === 'live';
                    const isRegistered = reg.attendance_status === 'registered';

                    return (
                        <div key={reg.id}>
                            <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-md hover:md:shadow-xl transition-all duration-300 overflow-hidden border-0 md:border border-gray-100 dark:border-gray-700 border-b md:border-b md:border-gray-100 dark:border-gray-700">
                                {/* Cover Image */}
                                {cls?.cover_image_url && (
                                    <div className="h-40 md:h-48 w-full overflow-hidden">
                                        <img
                                            src={cls.cover_image_url}
                                            alt={cls.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                <div className="p-4 md:p-6">
                                    <div className="flex justify-between items-start gap-2 mb-2 md:mb-3">
                                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">
                                            {cls?.title || 'Class'}
                                        </h3>
                                        {getStatusBadge(reg.attendance_status, cls?.status)}
                                    </div>

                                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-3 md:mb-4 line-clamp-2">
                                        {cls?.description}
                                    </p>

                                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span>{cls?.class_date ? new Date(cls.class_date).toLocaleDateString() : 'TBD'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span>
                                                {cls?.start_time?.slice(0, 5)} - {cls?.end_time?.slice(0, 5)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span>Host: {cls?.host_name || 'Unknown'}</span>
                                        </div>
                                        {cls?.is_cpd_eligible && (
                                            <div className="flex items-center gap-1.5 md:gap-2 text-green-600">
                                                <Award className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                <span>{cls.cpd_points} CPD Points</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Attendance Status */}
                                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className={`flex items-center gap-1.5 md:gap-2 ${attendance.color}`}>
                                            <attendance.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                            <span className="text-[10px] md:text-sm font-medium">
                                                Attendance: {attendance.text}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-3 md:mt-4 flex flex-wrap gap-1.5 md:gap-2">
                                        {isLive && cls?.meeting_link && (
                                            <button
                                                onClick={() => window.open(cls.meeting_link, '_blank')}
                                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] md:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                            >
                                                <Video className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                Join Now
                                            </button>
                                        )}

                                        {isUpcoming && !isLive && (
                                            <button
                                                onClick={() => navigate(`/live-classes/${cls?.id}`)}
                                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 text-gray-700 rounded-lg text-[10px] md:text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                            >
                                                <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                View Details
                                            </button>
                                        )}

                                        {!isUpcoming && (
                                            <button
                                                onClick={() => navigate(`/live-classes/${cls?.id}`)}
                                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 border border-gray-300 text-gray-700 rounded-lg text-[10px] md:text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                View Summary
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Mobile Separator */}
                            {index < filteredRegistrations.length - 1 && (
                                <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50" />
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredRegistrations.length === 0 && (
                <div className="text-center py-12 md:py-16 bg-white dark:bg-muted/30 rounded-none md:rounded-xl mx-4 md:mx-0">
                    <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">No classes found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 md:mt-2">
                        {filter === 'all'
                            ? "You haven't registered for any classes yet"
                            : `No ${filter} classes found`}
                    </p>
                    <button
                        onClick={() => navigate('/live-classes')}
                        className="mt-3 md:mt-4 px-4 md:px-6 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Browse Available Classes
                    </button>
                </div>
            )}
        </div>
    );
};