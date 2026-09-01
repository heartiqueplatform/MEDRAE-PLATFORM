// src/pages/live-classes/LiveClassesDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { liveClassService, registrationService } from '@/services/liveClassService';
import { toast } from 'sonner';
import {
    Calendar, Clock, Users, Video, MapPin, Award,
    Trash2, AlertTriangle, X, Loader2
} from 'lucide-react';

// Skeleton Loader Component
const LiveClassesSkeleton = () => {
    return (
        <div className="container mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 max-w-full animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-4 md:mb-8 px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0">
                <div className="space-y-2">
                    <div className="h-8 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 md:w-64"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 md:w-48"></div>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-8 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-16 md:w-20"></div>
                    ))}
                </div>
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8 px-4 md:px-0">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4">
                        <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 md:w-16 mb-2"></div>
                        <div className="h-6 md:h-8 bg-gray-200 dark:bg-gray-700 rounded w-8 md:w-12"></div>
                    </div>
                ))}
            </div>

            {/* Cards Skeleton - Updated grid for full width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 px-0 md:px-0">
                {[1, 2, 3, 4, 5, 6].map((i) => (
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
                            <div className="h-9 md:h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const LiveClassesDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('upcoming');
    const [registeredIds, setRegisteredIds] = useState(new Set());
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [classesData, registrations] = await Promise.all([
                liveClassService.getAllClasses(),
                user ? registrationService.getUserRegistrations() : Promise.resolve([])
            ]);

            setClasses(classesData);
            setRegisteredIds(new Set(registrations.map((r: any) => r.class_id)));
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (classId: string) => {
        if (!user) {
            toast.error('Please login first');
            navigate('/login');
            return;
        }

        try {
            await registrationService.registerForClass(classId);
            await loadData();
        } catch (error) {
            // Error handled in service
        }
    };

    const handleDeleteClick = (cls: any) => {
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
            console.error('Error deleting class:', error);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setClassToDelete(null);
    };

    const filteredClasses = classes.filter((cls: any) => {
        if (filter === 'all') return true;
        return cls.status === filter;
    });

    const isOwner = (cls: any) => {
        return user && cls.host_user_id === user.id;
    };

    // Show skeleton loader on first load
    if (loading) {
        return <LiveClassesSkeleton />;
    }

    return (
        // ✅ CHANGED: Removed max-w-2xl, added full width
        <div className="container mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 max-w-full">
            {/* Delete Confirmation Modal */}
            {deleteModalOpen && classToDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 md:p-4">
                    <div className="bg-white dark:bg-muted/30 rounded-xl shadow-2xl max-w-md w-full mx-0 md:mx-4 p-5 md:p-6 border-0">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                    <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                                    Delete Class
                                </h3>
                            </div>
                            <button
                                onClick={handleDeleteCancel}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="mb-5 md:mb-6">
                            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mb-2">
                                Are you sure you want to delete this class?
                            </p>
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-0">
                                <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                                    {classToDelete.title}
                                </p>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(classToDelete.class_date).toLocaleDateString()} at {classToDelete.start_time.slice(0, 5)}
                                </p>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                    {classToDelete.registration_count} students registered
                                </p>
                            </div>
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-0">
                                <p className="text-xs md:text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                                    <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 mt-0.5 flex-shrink-0" />
                                    <span>
                                        <strong>Warning:</strong> This action cannot be undone.
                                        All registrations and resources associated with this class will be permanently deleted.
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-2 md:gap-3">
                            <button
                                onClick={handleDeleteCancel}
                                className="flex-1 px-3 md:px-4 py-2 border-0 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm md:text-base"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                className="flex-1 px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" />
                                        Delete Class
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header - Mobile Native */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-4 md:mb-8 px-4 md:px-0 pt-4 md:pt-0 pb-3 md:pb-0 border-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Live Classes/Sessions</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 md:mt-1">Join live sessions and earn CPD points</p>
                </div>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {['upcoming', 'live', 'completed', 'all'].map((status) => (
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
            </div>

            {/* Stats - Mobile Native */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8 px-4 md:px-0">
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{classes.length}</p>
                </div>
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Upcoming</p>
                    <p className="text-xl md:text-2xl font-bold text-blue-600">
                        {classes.filter((c: any) => c.status === 'upcoming').length}
                    </p>
                </div>
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Live Now</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600">
                        {classes.filter((c: any) => c.status === 'live').length}
                    </p>
                </div>
                <div className="bg-white dark:bg-muted/30 rounded-lg p-3 md:p-4 shadow-none md:shadow-sm border-0">
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Registered</p>
                    <p className="text-xl md:text-2xl font-bold text-purple-600">{registeredIds.size}</p>
                </div>
            </div>

            {/* ✅ CHANGED: Class Cards - Grid with more columns on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-0 md:gap-4 lg:gap-6 px-0 md:px-0">
                {filteredClasses.map((cls: any, index: number) => {
                    const isRegistered = registeredIds.has(cls.id);
                    const isFull = cls.registration_count >= cls.max_students;
                    const isUpcoming = cls.status === 'upcoming' || cls.status === 'live';
                    const isLive = cls.status === 'live';
                    const isClassOwner = isOwner(cls);

                    const getStatusBadge = () => {
                        const styles = {
                            upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                            live: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 animate-pulse',
                            completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        };
                        return (
                            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-xs font-semibold ${styles[cls.status]}`}>
                                {cls.status.toUpperCase()}
                                {isLive && ' ●'}
                            </span>
                        );
                    };

                    return (
                        <div key={cls.id}>
                            <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-md hover:md:shadow-xl transition-all duration-300 overflow-hidden border-0">
                                {/* Cover Image if exists */}
                                {cls.cover_image_url && (
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
                                        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                                            {cls.title}
                                        </h3>
                                        {getStatusBadge()}
                                    </div>

                                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-3 md:mb-4 line-clamp-2">
                                        {cls.description}
                                    </p>

                                    <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span>{new Date(cls.class_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span>{cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                            <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            <span>{cls.registration_count} / {cls.max_students}</span>
                                        </div>
                                        {cls.is_cpd_eligible && (
                                            <div className="flex items-center gap-1.5 md:gap-2 text-green-600">
                                                <Award className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                <span>{cls.cpd_points} CPD Points</span>
                                            </div>
                                        )}
                                        {isClassOwner && (
                                            <div className="flex items-center gap-1.5 md:gap-2 text-blue-600 text-[10px] md:text-xs">
                                                <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                                <span>You are the host</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-3 md:mt-4 flex flex-wrap gap-1.5 md:gap-2">
                                        {isUpcoming && !isFull && !isRegistered && (
                                            <button
                                                onClick={() => handleRegister(cls.id)}
                                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] md:text-sm font-medium transition-colors"
                                            >
                                                Register
                                            </button>
                                        )}

                                        {isUpcoming && isFull && !isRegistered && (
                                            <button className="flex-1 px-3 md:px-4 py-1.5 md:py-2 bg-gray-400 text-white rounded-lg text-[10px] md:text-sm font-medium cursor-not-allowed" disabled>
                                                Full
                                            </button>
                                        )}

                                        {isRegistered && isUpcoming && (
                                            <button
                                                onClick={() => navigate(`/live-classes/${cls.id}`)}
                                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] md:text-sm font-medium transition-colors"
                                            >
                                                View
                                            </button>
                                        )}

                                        {isLive && cls.meeting_link && (
                                            <button
                                                onClick={() => window.open(cls.meeting_link, '_blank')}
                                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] md:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                                            >
                                                <Video className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                Join
                                            </button>
                                        )}

                                        {!isUpcoming && (
                                            <button
                                                onClick={() => navigate(`/live-classes/${cls.id}`)}
                                                className="flex-1 px-3 md:px-4 py-1.5 md:py-2 border-0 text-gray-700 rounded-lg text-[10px] md:text-sm font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                Details
                                            </button>
                                        )}

                                        {/* Delete Button - Only for class owner */}
                                        {isClassOwner && (
                                            <button
                                                onClick={() => handleDeleteClick(cls)}
                                                className="px-2.5 md:px-4 py-1.5 md:py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] md:text-sm font-medium transition-colors flex items-center gap-0.5 md:gap-1"
                                                title="Delete this class"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Mobile Separator */}
                            {index < filteredClasses.length - 1 && (
                                <div className="block md:hidden h-px bg-gray-200/50 dark:bg-gray-800/50" />
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredClasses.length === 0 && (
                <div className="text-center py-12 md:py-16 bg-white dark:bg-muted/30 rounded-none md:rounded-xl mx-4 md:mx-0">
                    <Calendar className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">No classes found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 md:mt-2">Check back later for new sessions</p>
                </div>
            )}
        </div>
    );
};