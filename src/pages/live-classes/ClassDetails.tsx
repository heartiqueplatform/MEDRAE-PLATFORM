// src/pages/live-classes/ClassDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { liveClassService, registrationService } from '@/services/liveClassService';
import { toast } from 'sonner';
import {
    Calendar, Clock, Users, Video, Award, MapPin, Link as LinkIcon,
    BookOpen, CheckCircle, XCircle, AlertCircle, ArrowLeft,
    Copy, ExternalLink, FileText, Star, Timer, Lock,
    UserCheck, UserX, CalendarDays
} from 'lucide-react';

export const ClassDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [classData, setClassData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registrationId, setRegistrationId] = useState<string | null>(null);
    const [registrationStatus, setRegistrationStatus] = useState<string>('');
    const [timeRemaining, setTimeRemaining] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });
    const [canJoin, setCanJoin] = useState(false);

    useEffect(() => {
        if (id) {
            loadClassData();
        }
    }, [id]);

    useEffect(() => {
        if (classData) {
            if (user) {
                const registration = classData.registrations?.find(
                    (reg: any) => reg.user_id === user.id && reg.attendance_status !== 'cancelled'
                );
                setIsRegistered(!!registration);
                setRegistrationId(registration?.id || null);
                setRegistrationStatus(registration?.attendance_status || '');
            }

            const updateTimer = () => {
                const now = new Date();
                const classDateTime = new Date(`${classData.class_date}T${classData.start_time}`);
                const diff = classDateTime.getTime() - now.getTime();

                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeRemaining({ days, hours, minutes, seconds });
                } else {
                    setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                }

                const classStart = new Date(`${classData.class_date}T${classData.start_time}`);
                const classEnd = new Date(`${classData.class_date}T${classData.end_time}`);
                const fifteenMinBefore = new Date(classStart.getTime() - 15 * 60000);
                const canJoinNow = now >= fifteenMinBefore && now <= classEnd;
                setCanJoin(canJoinNow);
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        }
    }, [classData, user]);

    const loadClassData = async () => {
        try {
            setLoading(true);
            const data = await liveClassService.getClassById(id!);
            setClassData(data);
        } catch (error) {
            console.error('Error loading class:', error);
            toast.error('Failed to load class details');
            navigate('/live-classes');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!user) {
            toast.error('Please login first');
            navigate('/login');
            return;
        }

        try {
            await registrationService.registerForClass(id!);
            toast.success('Successfully registered for class!');
            await loadClassData();
        } catch (error) {
            // Error handled in service
        }
    };

    const handleCancelRegistration = async () => {
        if (!registrationId) return;

        try {
            await registrationService.cancelRegistration(registrationId);
            toast.success('Registration cancelled');
            await loadClassData();
        } catch (error) {
            // Error handled in service
        }
    };

    const handleJoinClass = () => {
        if (classData?.meeting_link) {
            window.open(classData.meeting_link, '_blank');
        } else {
            toast.error('No meeting link available');
        }
    };

    const handleCopyLink = () => {
        if (classData?.meeting_link) {
            navigator.clipboard.writeText(classData.meeting_link);
            toast.success('Meeting link copied to clipboard!');
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (time: string) => {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusBadge = () => {
        if (!classData) return null;

        const styles: Record<string, string> = {
            upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            live: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 animate-pulse',
            completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        };

        const labels: Record<string, string> = {
            upcoming: 'Upcoming',
            live: 'Live Now',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };

        return (
            <span className={`px-2 md:px-4 py-0.5 md:py-2 rounded-full text-[10px] md:text-sm font-semibold ${styles[classData.status]}`}>
                {labels[classData.status] || classData.status}
            </span>
        );
    };

    const getRegistrationBadge = () => {
        if (!isRegistered) return null;

        const styles: Record<string, string> = {
            registered: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            attended: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            missed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };

        const labels: Record<string, string> = {
            registered: 'Registered',
            attended: 'Attended',
            missed: 'Missed',
            cancelled: 'Cancelled'
        };

        const status = registrationStatus || 'registered';
        return (
            <span className={`px-2 md:px-4 py-0.5 md:py-2 rounded-full text-[10px] md:text-sm font-semibold ${styles[status]}`}>
                {labels[status] || 'Registered'}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-0 mx-auto"></div>
                    <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-600 dark:text-gray-400">Loading class details...</p>
                </div>
            </div>
        );
    }

    if (!classData) {
        return (
            <div className="container mx-auto px-4 md:px-4 py-8 text-center">
                <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500 mx-auto mb-3 md:mb-4" />
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Class not found</h2>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">The class you're looking for doesn't exist.</p>
                <button
                    onClick={() => navigate('/live-classes')}
                    className="mt-3 md:mt-4 px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm md:text-base"
                >
                    Back to Classes
                </button>
            </div>
        );
    }

    const isUpcoming = classData.status === 'upcoming';
    const isLive = classData.status === 'live';
    const isCompleted = classData.status === 'completed';
    const isFull = classData.registration_count >= classData.max_students;
    const canRegister = isUpcoming && !isFull && !isRegistered;

    return (
        // ✅ CHANGED: Removed max-w-2xl, added full width
        <div className="container mx-auto px-0 md:px-4 lg:px-6 py-4 md:py-8 max-w-full">
            {/* Back Button - Mobile Native */}
            <button
                onClick={() => navigate('/live-classes')}
                className="flex items-center gap-1.5 md:gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 md:mb-6 transition-colors px-4 md:px-0"
            >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base">Back to Classes</span>
            </button>

            {/* Cover Image - Mobile Native */}
            {classData.cover_image_url && (
                <div className="rounded-none md:rounded-xl overflow-hidden mb-4 md:mb-6">
                    <img
                        src={classData.cover_image_url}
                        alt={classData.title}
                        className="w-full h-48 md:h-72 object-cover"
                    />
                </div>
            )}

            {/* Header Card - Mobile Native */}
            <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6 mb-4 md:mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white break-words">
                            {classData.title}
                        </h1>
                        <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
                            Hosted by <span className="font-semibold">{classData.host_name}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {getStatusBadge()}
                        {getRegistrationBadge()}
                    </div>
                </div>
            </div>

            {/* Countdown Timer - Mobile Native */}
            {isUpcoming && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-none md:rounded-xl p-4 md:p-6 mb-4 md:mb-6 border-0">
                    <h3 className="text-center text-base md:text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2 md:mb-3 flex items-center justify-center gap-1.5 md:gap-2">
                        <Timer className="h-4 w-4 md:h-5 md:w-5" />
                        Class Starts In
                    </h3>
                    <div className="flex justify-center gap-3 md:gap-8">
                        <div className="text-center">
                            <div className="text-2xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {String(timeRemaining.days).padStart(2, '0')}
                            </div>
                            <div className="text-[8px] md:text-xs text-blue-800 dark:text-blue-300">Days</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {String(timeRemaining.hours).padStart(2, '0')}
                            </div>
                            <div className="text-[8px] md:text-xs text-blue-800 dark:text-blue-300">Hours</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {String(timeRemaining.minutes).padStart(2, '0')}
                            </div>
                            <div className="text-[8px] md:text-xs text-blue-800 dark:text-blue-300">Minutes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl md:text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {String(timeRemaining.seconds).padStart(2, '0')}
                            </div>
                            <div className="text-[8px] md:text-xs text-blue-800 dark:text-blue-300">Seconds</div>
                        </div>
                    </div>
                    <p className="text-center text-xs md:text-sm text-blue-700 dark:text-blue-300 mt-2 md:mt-3">
                        {formatDate(classData.class_date)} at {formatTime(classData.start_time)}
                    </p>
                </div>
            )}

            {/* Class Information Card - Mobile Native */}
            <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6 mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                    <CalendarDays className="h-4 w-4 md:h-5 md:w-5" />
                    Class Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Calendar className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Date</p>
                            <p className="text-xs md:text-sm text-gray-900 dark:text-white font-medium">
                                {formatDate(classData.class_date)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <Clock className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Time</p>
                            <p className="text-xs md:text-sm text-gray-900 dark:text-white font-medium">
                                {formatTime(classData.start_time)} - {formatTime(classData.end_time)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <MapPin className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Category</p>
                            <p className="text-xs md:text-sm text-gray-900 dark:text-white font-medium">
                                {classData.topic_category}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <Users className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                        <div>
                            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Capacity</p>
                            <p className="text-xs md:text-sm text-gray-900 dark:text-white font-medium">
                                {classData.registration_count} / {classData.max_students} registered
                            </p>
                        </div>
                    </div>
                    {classData.is_cpd_eligible && (
                        <div className="flex items-center gap-2 md:gap-3 sm:col-span-2">
                            <Award className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                            <div>
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">CPD Points</p>
                                <p className="text-xs md:text-sm text-green-600 dark:text-green-400 font-medium">
                                    {classData.cpd_points} Points
                                    {classData.cpd_accreditation_number && (
                                        <span className="text-[8px] md:text-xs block text-gray-500">
                                            {classData.cpd_accreditation_number}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Description Card - Mobile Native */}
            <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6 mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                    <FileText className="h-4 w-4 md:h-5 md:w-5" />
                    About This Class
                </h3>
                {classData.description ? (
                    <ul className="list-disc list-inside space-y-2 md:space-y-3 text-xs md:text-base text-gray-700 dark:text-gray-300">
                        {classData.description.split('\n\n').map((paragraph: string, index: number) => (
                            paragraph.trim() && <li key={index}>{paragraph.trim()}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs md:text-base text-gray-700 dark:text-gray-300">No description provided.</p>
                )}
            </div>

            {/* Prerequisites Card - Mobile Native */}
            {classData.prerequisites && (
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6 mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                        <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                        Prerequisites
                    </h3>
                    <p className="text-xs md:text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {classData.prerequisites}
                    </p>
                </div>
            )}

            {/* Learning Objectives Card - Mobile Native */}
            {classData.learning_objectives && classData.learning_objectives.length > 0 && (
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6 mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                        <Star className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                        Learning Objectives
                    </h3>
                    <ul className="list-disc list-inside space-y-1.5 md:space-y-2 text-xs md:text-base text-gray-700 dark:text-gray-300">
                        {classData.learning_objectives.map((obj: string, index: number) => (
                            <li key={index}>{obj}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Resources Card - Mobile Native */}
            {classData.resources && classData.resources.length > 0 && (
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6 mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                        <FileText className="h-4 w-4 md:h-5 md:w-5" />
                        Resources
                    </h3>
                    <div className="space-y-1.5 md:space-y-2">
                        {classData.resources.map((resource: any) => (
                            <a
                                key={resource.id}
                                href={resource.resource_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                                <span className="flex-1 text-xs md:text-sm text-gray-700 dark:text-gray-300">
                                    {resource.title}
                                </span>
                                <span className="text-[8px] md:text-xs text-gray-500 dark:text-gray-400">
                                    {resource.resource_type}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Meeting Link Card - Mobile Native */}
            {classData.meeting_link && (
                <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6 mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                        <Video className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
                        Meeting Link
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                        {classData.meeting_platform && (
                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                <span className="text-[10px] md:text-sm text-gray-500">Platform:</span>
                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-100 dark:bg-gray-700 rounded text-[8px] md:text-xs font-medium">
                                    {classData.meeting_platform.replace('_', ' ').toUpperCase()}
                                </span>
                                {classData.meeting_id && (
                                    <span className="text-[10px] md:text-sm text-gray-500">
                                        ID: {classData.meeting_id}
                                    </span>
                                )}
                            </div>
                        )}

                        {(canJoin || isRegistered || isLive) && (
                            <button
                                onClick={handleJoinClass}
                                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 md:gap-2 text-sm md:text-base"
                            >
                                <Video className="h-4 w-4 md:h-5 md:w-5" />
                                {isLive ? 'Join Class Now' : isUpcoming ? 'Join (Early Access)' : 'View Recording'}
                            </button>
                        )}

                        <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <LinkIcon className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400 flex-shrink-0" />
                            <span className="flex-1 text-[10px] md:text-sm text-gray-600 dark:text-gray-400 truncate">
                                {classData.meeting_link}
                            </span>
                            <button
                                onClick={handleCopyLink}
                                className="p-0.5 md:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                title="Copy link"
                            >
                                <Copy className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
                            </button>
                            <a
                                href={classData.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-0.5 md:p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                title="Open in new tab"
                            >
                                <ExternalLink className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
                            </a>
                        </div>

                        {classData.meeting_password && (
                            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-gray-500">
                                <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span>Password:</span>
                                <code className="px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-100 dark:bg-gray-700 rounded text-[8px] md:text-xs font-mono">
                                    {classData.meeting_password}
                                </code>
                            </div>
                        )}

                        {isUpcoming && !canJoin && !isRegistered && (
                            <p className="text-[10px] md:text-sm text-yellow-600 dark:text-yellow-400 text-center flex items-center justify-center gap-1">
                                <Lock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                Join link will be available 15 minutes before class starts
                            </p>
                        )}

                        {isUpcoming && !canJoin && isRegistered && (
                            <p className="text-[10px] md:text-sm text-yellow-600 dark:text-yellow-400 text-center">
                                Class starts in {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Registration Card - Mobile Native */}
            <div className="bg-white dark:bg-muted/30 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 p-4 md:p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2">
                    <UserCheck className="h-4 w-4 md:h-5 md:w-5" />
                    Registration
                </h3>
                <div className="space-y-2.5 md:space-y-3">
                    {isRegistered ? (
                        <>
                            <div className="flex items-center gap-1.5 md:gap-2 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                                <span className="text-xs md:text-base font-medium">You are registered for this class</span>
                            </div>
                            {isUpcoming && (
                                <button
                                    onClick={handleCancelRegistration}
                                    className="w-full px-3 md:px-4 py-2 border-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors text-xs md:text-base"
                                >
                                    Cancel Registration
                                </button>
                            )}
                            {isCompleted && registrationStatus === 'attended' && (
                                <div className="p-2.5 md:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-1.5 md:gap-2">
                                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                                    <p className="text-xs md:text-sm text-green-700 dark:text-green-300">
                                        You attended this class
                                    </p>
                                </div>
                            )}
                            {isCompleted && registrationStatus === 'missed' && (
                                <div className="p-2.5 md:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-1.5 md:gap-2">
                                    <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600 dark:text-red-400" />
                                    <p className="text-xs md:text-sm text-red-700 dark:text-red-300">
                                        You missed this class
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {canRegister ? (
                                <button
                                    onClick={handleRegister}
                                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-xs md:text-base"
                                >
                                    Register for Class
                                </button>
                            ) : isFull && isUpcoming ? (
                                <div className="text-center">
                                    <p className="text-red-600 dark:text-red-400 font-medium text-xs md:text-base">Class is Full</p>
                                    <p className="text-[10px] md:text-sm text-gray-500 mt-0.5 md:mt-1">All spots have been taken</p>
                                </div>
                            ) : isCompleted ? (
                                <p className="text-gray-500 text-center text-xs md:text-base">This class has ended</p>
                            ) : isLive ? (
                                <p className="text-green-600 text-center text-xs md:text-base">Class is in progress</p>
                            ) : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};