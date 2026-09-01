// src/pages/grouppay/[id].tsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { grouppayService } from '@/services/grouppayService';
import { StudyGroup, GroupPaymentStatus, GROUPPAY_CONFIG } from '@/types/grouppay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ArrowLeft,
    Users,
    User,
    UserPlus,
    UserMinus,
    Copy,
    Share2,
    Lock,
    Unlock,
    Calendar,
    DollarSign,
    Phone,
    Crown,
    Trash2,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2,
    RefreshCw,
    Users2,
    Info,
    MessageCircle,
    Mail,
    AlertTriangle,
    Shield,
    ExternalLink,
    Sparkles,
    PartyPopper,
    Gift,
    Rocket,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// ============================================================
// COMPONENT
// ============================================================
export default function GroupDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [group, setGroup] = useState<StudyGroup | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [userRole, setUserRole] = useState<'leader' | 'member' | null>(null);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<GroupPaymentStatus | null>(null);
    const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form');
    const [showCelebration, setShowCelebration] = useState(false);
    const [showCelebrationModal, setShowCelebrationModal] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // ============================================================
    // SOUND & CELEBRATION
    // ============================================================
    const playSuccessSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio('/sounds/Toast.mp3');
                audioRef.current.volume = 0.7;
            }
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
                // Silently fail if audio can't play
            });
        } catch (error) {
            // Silently fail
        }
    }, []);

    const triggerConfetti = useCallback(() => {
        try {
            const duration = 3000;
            const end = Date.now() + duration;
            const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

            (function frame() {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors,
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors,
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            })();

            setTimeout(() => {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: colors,
                });
            }, 100);

            setTimeout(() => {
                confetti({
                    particleCount: 100,
                    spread: 80,
                    origin: { y: 0.5, x: 0.3 },
                    colors: colors,
                });
            }, 300);

            setTimeout(() => {
                confetti({
                    particleCount: 100,
                    spread: 80,
                    origin: { y: 0.5, x: 0.7 },
                    colors: colors,
                });
            }, 500);

        } catch (error) {
            console.error('Confetti error:', error);
        }
    }, []);

    const handleSuccess = useCallback(() => {
        playSuccessSound();
        triggerConfetti();
        setShowCelebration(true);
        setShowCelebrationModal(true);

        setTimeout(() => {
            setShowCelebration(false);
            setShowCelebrationModal(false);
        }, 8000);
    }, [playSuccessSound, triggerConfetti]);

    // ============================================================
    // LOAD DATA
    // ============================================================
    useEffect(() => {
        if (id) {
            loadGroup();
            loadPaymentStatus();
        }
    }, [id]);

    const loadGroup = useCallback(async () => {
        try {
            setLoading(true);
            const data = await grouppayService.getGroupById(id!);
            if (data) {
                setGroup(data);
                if (user) {
                    const member = await grouppayService.isUserMember(data.id, user.id);
                    setIsMember(member);
                    if (member) {
                        const role = await grouppayService.getUserRole(data.id, user.id);
                        setUserRole(role);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading group:', error);
            toast.error('Failed to load group details');
        } finally {
            setLoading(false);
        }
    }, [id, user]);

    const loadPaymentStatus = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingPaymentStatus(true);
            const status = await grouppayService.getGroupPaymentStatus(id);
            setPaymentStatus(status);
        } catch (error) {
            console.error('Error loading payment status:', error);
        } finally {
            setLoadingPaymentStatus(false);
        }
    }, [id]);

    // ============================================================
    // CALCULATIONS - Auto-computed
    // ============================================================
    const isCreator = user?.id === group?.created_by;
    const currentMemberCount = group?.current_members || 0;
    const maxMembers = group?.max_members || GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT;
    const pricePerMember = group?.contribution_per_member || GROUPPAY_CONFIG.PRICE_PER_MEMBER;

    const totalAmount = useMemo(() => {
        return currentMemberCount * pricePerMember;
    }, [currentMemberCount, pricePerMember]);

    const hasMinimumMembers = useMemo(() => {
        return currentMemberCount >= GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED;
    }, [currentMemberCount]);

    const isFull = useMemo(() => {
        return currentMemberCount >= maxMembers;
    }, [currentMemberCount, maxMembers]);

    const canPay = useMemo(() => {
        return isCreator &&
            hasMinimumMembers &&
            group?.status !== 'active' &&
            !group?.is_locked;
    }, [isCreator, hasMinimumMembers, group?.status, group?.is_locked]);

    const progress = useMemo(() => {
        return (currentMemberCount / maxMembers) * 100;
    }, [currentMemberCount, maxMembers]);

    const membersNeeded = useMemo(() => {
        return Math.max(0, GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED - currentMemberCount);
    }, [currentMemberCount]);

    // ============================================================
    // CONTACT HANDLERS
    // ============================================================
    const handlePhoneClick = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            window.location.href = `tel:+254${cleaned.substring(1)}`;
        } else if (cleaned.startsWith('254')) {
            window.location.href = `tel:+${cleaned}`;
        } else {
            window.location.href = `tel:${cleaned}`;
        }
    };

    const handleWhatsAppClick = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        let number = cleaned;
        if (cleaned.startsWith('0')) {
            number = '254' + cleaned.substring(1);
        } else if (!cleaned.startsWith('254')) {
            number = '254' + cleaned;
        }
        window.open(`https://wa.me/${number}`, '_blank');
    };

    const handleEmailClick = (email: string) => {
        window.location.href = `mailto:${email}`;
    };

    // ============================================================
    // HANDLERS
    // ============================================================
    const handleJoinGroup = async () => {
        if (!user) {
            toast.error('Please log in to join this group');
            return;
        }

        if (!group) return;

        if (isFull) {
            toast.error('This group is full');
            return;
        }

        setJoining(true);
        try {
            await grouppayService.addMemberToGroup(group.id, user.id);
            toast.success('Joined group successfully!');
            await loadGroup();
        } catch (error: any) {
            toast.error(error.message || 'Failed to join group');
        } finally {
            setJoining(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!user || !group) return;

        setLeaving(true);
        try {
            await grouppayService.removeMemberFromGroup(group.id, user.id);
            toast.success('Left group successfully');
            await loadGroup();
            setShowLeaveDialog(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to leave group');
        } finally {
            setLeaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!user || !group) return;

        setDeleting(true);
        try {
            await grouppayService.deleteGroup(group.id, user.id);
            toast.success('Group deleted successfully');
            navigate('/grouppay');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete group');
        } finally {
            setDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    const handleCopyInviteCode = () => {
        if (!group) return;
        navigator.clipboard.writeText(group.group_code);
        toast.success('Invite code copied to clipboard!');
    };

    const handleShareGroup = async () => {
        if (!group) return;
        try {
            await navigator.share({
                title: `Join ${group.group_name} on Medrae GroupPay`,
                text: `Join our study group "${group.group_name}" using code: ${group.group_code}`,
                url: window.location.href,
            });
        } catch (error) {
            // User cancelled share
        }
    };

    const handleInitiatePayment = async () => {
        if (!user) {
            toast.error('Please log in to make payment');
            return;
        }

        if (!group) {
            toast.error('Group data not loaded');
            return;
        }

        if (!phoneNumber || phoneNumber.length < 10) {
            toast.error('Please enter a valid phone number');
            return;
        }

        if (!hasMinimumMembers) {
            toast.error(`Need at least ${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED} members to activate the group`);
            return;
        }

        if (!user.id) {
            toast.error('User ID not found. Please log out and log in again.');
            return;
        }

        if (!group.id) {
            toast.error('Group ID not found');
            return;
        }

        setProcessingPayment(true);
        setPaymentStep('processing');

        try {
            const result = await grouppayService.initiateGroupPayment(
                group.id,
                user.id,
                phoneNumber
            );

            setPaymentStep('success');
            toast.success('Payment initiated! Check your phone for M-Pesa prompt.');

            let isCompleted = false;

            const interval = setInterval(async () => {
                try {
                    const status = await grouppayService.getGroupPaymentStatus(group.id);
                    setPaymentStatus(status);
                    if (status.is_successful && !isCompleted) {
                        isCompleted = true;
                        clearInterval(interval);

                        // Close payment dialog
                        setShowPaymentDialog(false);
                        setPaymentStep('form');
                        setPhoneNumber('');

                        // Show success celebration
                        handleSuccess();

                        // Reload group data
                        await loadGroup();
                    }
                } catch (pollError) {
                    console.error('Error polling payment status:', pollError);
                }
            }, 3000);

            setTimeout(() => clearInterval(interval), 180000);

        } catch (error: any) {
            console.error('Payment error:', error);
            setPaymentStep('failed');
            toast.error(error.message || 'Failed to initiate payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleRetryPayment = async () => {
        if (!user || !group) return;

        try {
            await grouppayService.retryGroupPayment(group.id, user.id);
            toast.success('Payment retry initiated');
            await loadPaymentStatus();
        } catch (error: any) {
            toast.error(error.message || 'Failed to retry payment');
        }
    };

    // ============================================================
    // RENDER: Loading State
    // ============================================================
    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="animate-pulse space-y-8">
                    <div className="h-8 w-32 bg-muted rounded" />
                    <div className="h-64 bg-muted rounded" />
                </div>
            </div>
        );
    }

    // ============================================================
    // RENDER: Not Found
    // ============================================================
    if (!group) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
                <h2 className="text-2xl font-bold">Group Not Found</h2>
                <p className="text-muted-foreground mt-2">The group you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/grouppay')} className="mt-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Groups
                </Button>
            </div>
        );
    }

    // ============================================================
    // RENDER: Main
    // ============================================================
    return (
        <div className="container mx-auto px-0 md:px-4 py-4 md:py-8 max-w-4xl">
            {/* Celebration Overlay Background */}
            {showCelebration && (
                <div className="fixed inset-0 z-[9998] pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-transparent animate-pulse" />
                </div>
            )}

            {/* ============================================================ */}
            {/* 🎉 CELEBRATION MODAL - Custom Overlay */}
            {/* ============================================================ */}
            {showCelebrationModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500 p-4">
                    {/* Background particles effect */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-300" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-700" />
                    </div>

                    <div className="max-w-lg w-full mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-2 border-green-400/30 dark:border-green-500/30 p-8 text-center animate-in zoom-in-95 duration-500 scale-100 relative z-10">
                        {/* Big Icon with sparkles */}
                        <div className="relative w-28 h-28 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 dark:from-green-900/40 dark:via-blue-900/40 dark:to-purple-900/40 animate-pulse" />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500/20 via-blue-500/20 to-purple-500/20 blur-xl" />
                            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 flex items-center justify-center shadow-xl shadow-green-500/30">
                                <PartyPopper className="w-14 h-14 text-green-600 dark:text-green-400" />
                            </div>
                            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
                            <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 text-blue-400 animate-pulse delay-200" />
                        </div>

                        {/* Title */}
                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                            Group Activated! 🎉
                        </h3>

                        {/* Subtitle */}
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Premium access unlocked for all {currentMemberCount} members
                        </p>

                        {/* Stats Card */}
                        <div className="bg-slate-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-gray-700">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentMemberCount}</p>
                                    <p className="text-[10px] text-muted-foreground">Members</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-gray-700">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{GROUPPAY_CONFIG.CURRENCY} {pricePerMember}</p>
                                    <p className="text-[10px] text-muted-foreground">Per Member</p>
                                </div>
                                <div className="text-center border-l border-slate-200 dark:border-gray-700">
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{GROUPPAY_CONFIG.CURRENCY} {totalAmount}</p>
                                    <p className="text-[10px] text-muted-foreground">Total Paid</p>
                                </div>
                            </div>
                        </div>

                        {/* Savings Message */}
                        <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800/30">
                            <Rocket className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                                Saved {GROUPPAY_CONFIG.CURRENCY} {(currentMemberCount * pricePerMember) - (currentMemberCount * 99)} compared to individual plans!
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={() => {
                                    setShowCelebrationModal(false);
                                    setShowCelebration(false);
                                }}
                                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-6 rounded-2xl text-base shadow-xl shadow-green-500/30 hover:shadow-2xl transition-all"
                            >
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Awesome! Let's Go
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCelebrationModal(false);
                                    setShowCelebration(false);
                                    navigate('/grouppay');
                                }}
                                className="flex-1 border-2 border-slate-300 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 font-medium py-6 rounded-2xl text-base"
                            >
                                <Users className="w-5 h-5 mr-2" />
                                Browse Groups
                            </Button>
                        </div>

                        {/* Footer */}
                        <p className="text-[10px] text-muted-foreground mt-4 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            All members upgraded to premium automatically
                        </p>
                    </div>
                </div>
            )}

            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => navigate('/grouppay')}
                className="mb-4 md:mb-6 gap-2 text-sm mx-4 md:mx-0"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Groups
            </Button>

            {/* Main Group Info */}
            <Card className="mb-6 rounded-none md:rounded-lg shadow-none md:shadow-sm border-0 md:border">
                <CardHeader className="pb-4 px-4 md:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl md:text-3xl flex items-center flex-wrap gap-2">
                                {group.group_name}
                                {isCreator && (
                                    <Badge variant="default" className="bg-yellow-500 text-white text-xs">
                                        <Crown className="w-3 h-3 mr-1" />
                                        Leader
                                    </Badge>
                                )}
                                {group.status === 'active' && (
                                    <Badge variant="default" className="bg-green-500 text-white text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Active
                                    </Badge>
                                )}
                            </CardTitle>
                            <CardDescription className="text-sm mt-1">
                                {group.school}
                            </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge
                                variant={group.is_locked ? "destructive" : "default"}
                                className="text-xs px-2 py-0.5"
                            >
                                {group.is_locked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                                {group.is_locked ? 'Locked' : 'Open'}
                            </Badge>
                            <Badge
                                variant={
                                    group.status === 'active' ? 'success' :
                                        group.status === 'payment_pending' ? 'warning' :
                                            group.status === 'closed' ? 'secondary' : 'default'
                                }
                                className="text-xs px-2 py-0.5"
                            >
                                {group.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {group.status === 'payment_pending' && <Clock className="w-3 h-3 mr-1" />}
                                {group.status === 'closed' && <AlertCircle className="w-3 h-3 mr-1" />}
                                {group.status.replace('_', ' ')}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 md:space-y-6 px-4 md:px-6">
                    {/* Creator and Date */}
                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>Created by {group.creator?.name || 'Unknown'}</span>
                            {isCreator && (
                                <Badge variant="outline" className="text-[10px]">You</Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}</span>
                        </div>
                    </div>

                    {/* Description */}
                    {group.description && (
                        <div className="p-3 md:p-4 bg-muted/50 rounded-lg">
                            <p className="text-xs md:text-sm">{group.description}</p>
                        </div>
                    )}

                    {/* Contact Information */}
                    {(group.leader_phone || group.leader_whatsapp || group.leader_email) && (
                        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-green-600" />
                                <h4 className="font-semibold text-sm">Group Leader Contact</h4>
                                <Badge variant="outline" className="text-[9px] text-muted-foreground">
                                    For Contributions
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Send your contribution ({GROUPPAY_CONFIG.CURRENCY} {group.contribution_per_member}) to the group leader
                            </p>
                            <div className="space-y-2">
                                {group.leader_phone && (
                                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg border border-muted">
                                        <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <span className="font-mono text-sm flex-1">{group.leader_phone}</span>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs"
                                                onClick={() => handlePhoneClick(group.leader_phone || '')}
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                <span className="sr-only md:not-sr-only md:ml-1">Call</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(group.leader_phone || '');
                                                    toast.success('Phone number copied!');
                                                }}
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                                <span className="sr-only md:not-sr-only md:ml-1">Copy</span>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {group.leader_whatsapp && (
                                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg border border-muted">
                                        <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <span className="font-mono text-sm flex-1">{group.leader_whatsapp}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                            onClick={() => handleWhatsAppClick(group.leader_whatsapp || '')}
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span className="sr-only md:not-sr-only md:ml-1">Chat</span>
                                            <ExternalLink className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                )}
                                {group.leader_email && (
                                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg border border-muted">
                                        <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm flex-1 truncate">{group.leader_email}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                            onClick={() => handleEmailClick(group.leader_email || '')}
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            <span className="sr-only md:not-sr-only md:ml-1">Email</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                                    Only send money to group leaders you know personally.
                                    Medrae does not handle individual contributions.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Members Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {currentMemberCount} / {maxMembers} Members
                            </span>
                            <span className="text-xs">{Math.round(progress)}% full</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />

                        <div className={`flex items-center gap-2 text-xs ${hasMinimumMembers ? 'text-green-600' : 'text-amber-600'}`}>
                            {hasMinimumMembers ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                                <AlertCircle className="w-3.5 h-3.5" />
                            )}
                            <span>
                                {hasMinimumMembers
                                    ? `Ready! ${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED}+ members`
                                    : `Need ${membersNeeded} more member${membersNeeded > 1 ? 's' : ''} to reach ${GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED} members`
                                }
                            </span>
                        </div>
                    </div>

                    {/* Contribution Info */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Per Member</p>
                            <p className="text-base md:text-lg font-bold">{GROUPPAY_CONFIG.CURRENCY} {pricePerMember}</p>
                        </div>
                        <div className="text-center border-l border-muted-foreground/20 pl-2">
                            <p className="text-xs text-muted-foreground">Members</p>
                            <p className="text-base md:text-lg font-bold">{currentMemberCount}</p>
                        </div>
                        <div className="text-center border-l border-muted-foreground/20 pl-2">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-base md:text-lg font-bold text-green-600">{GROUPPAY_CONFIG.CURRENCY} {totalAmount}</p>
                        </div>
                    </div>

                    {/* Payment Status */}
                    {paymentStatus && (
                        <div className="p-3 md:p-4 bg-muted/30 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Payment Status</span>
                                <Badge
                                    variant={
                                        paymentStatus.is_successful ? 'success' :
                                            paymentStatus.status === 'pending' ? 'warning' : 'secondary'
                                    }
                                    className="text-xs"
                                >
                                    {paymentStatus.is_successful ? (
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                    ) : paymentStatus.status === 'pending' ? (
                                        <Clock className="w-3 h-3 mr-1" />
                                    ) : (
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                    )}
                                    {paymentStatus.status}
                                </Badge>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Amount</span>
                                <span className="font-medium">{GROUPPAY_CONFIG.CURRENCY} {paymentStatus.total_amount}</span>
                            </div>
                            {paymentStatus.mpesa_receipt && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">M-Pesa Receipt</span>
                                    <span className="font-mono text-xs">{paymentStatus.mpesa_receipt}</span>
                                </div>
                            )}
                            {paymentStatus.result_desc && paymentStatus.status === 'failed' && (
                                <div className="flex items-center gap-2 text-sm text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{paymentStatus.result_desc}</span>
                                </div>
                            )}
                            {paymentStatus.status === 'failed' && isCreator && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRetryPayment}
                                    className="w-full gap-2 text-sm"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Retry Payment
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Group Code */}
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Group Code:</span>
                        <code className="px-2 py-0.5 bg-background rounded font-mono text-sm font-bold">
                            {group.group_code}
                        </code>
                        <Button variant="ghost" size="sm" onClick={handleCopyInviteCode} className="gap-1 text-xs">
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleShareGroup} className="gap-1 text-xs">
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                        </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                        {!isMember && !isFull && group.status !== 'closed' && !group.is_locked && (
                            <Button onClick={handleJoinGroup} disabled={joining} className="flex-1 gap-2 text-sm">
                                <UserPlus className="w-4 h-4" />
                                {joining ? 'Joining...' : 'Join Group'}
                            </Button>
                        )}
                        {isMember && !isCreator && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowLeaveDialog(true)}
                                    className="gap-2 text-sm"
                                    disabled={leaving}
                                >
                                    <UserMinus className="w-4 h-4" />
                                    Leave Group
                                </Button>
                                <Button
                                    className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-sm"
                                    onClick={() => setShowPaymentDialog(true)}
                                    disabled={group.status === 'active' || !hasMinimumMembers}
                                    title={!hasMinimumMembers ? `Need ${membersNeeded} more members` : ''}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    {group.status === 'active' ? 'Group Active' : 'Pay for Group'}
                                </Button>
                            </>
                        )}
                        {isCreator && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowDeleteDialog(true)}
                                    className="gap-2 text-sm"
                                    disabled={deleting}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </Button>
                                <Button
                                    className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-sm"
                                    onClick={() => setShowPaymentDialog(true)}
                                    disabled={group.status === 'active' || !hasMinimumMembers}
                                    title={!hasMinimumMembers ? `Need ${membersNeeded} more members` : ''}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    {group.status === 'active' ? 'Group Active' : 'Pay for Group'}
                                </Button>
                            </>
                        )}
                        {isFull && !isMember && (
                            <Badge variant="secondary" className="text-sm px-3 py-1.5">
                                Group Full
                            </Badge>
                        )}
                        {group.is_locked && !isMember && (
                            <Badge variant="destructive" className="text-sm px-3 py-1.5">
                                Locked
                            </Badge>
                        )}
                        {group.status === 'closed' && !isMember && (
                            <Badge variant="secondary" className="text-sm px-3 py-1.5">
                                Closed
                            </Badge>
                        )}
                    </div>

                    {/* Minimum Members Warning */}
                    {isCreator && !hasMinimumMembers && group.status !== 'active' && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-700 dark:text-amber-300">
                                <p className="font-medium">Need {membersNeeded} more members</p>
                                <p className="text-amber-600/80 dark:text-amber-400/80">
                                    Groups need at least {GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED} members to activate premium access.
                                    Share your group code with friends!
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Members List */}
            <Card className="rounded-none md:rounded-lg shadow-none md:shadow-sm border-0 md:border">
                <CardHeader className="pb-3 px-4 md:px-6">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="w-4 h-4" />
                        Members ({currentMemberCount})
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {group.members?.map((member) => {
                            const isLeader = member.role === 'leader';
                            const isCurrentUser = member.user_id === user?.id;

                            return (
                                <div key={member.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={member.profile?.avatar_url} />
                                        <AvatarFallback className="text-xs">
                                            {member.profile?.name?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium flex items-center gap-1.5 truncate">
                                            {member.profile?.name || 'Unknown'}
                                            {isLeader && <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                                            {isCurrentUser && <Badge variant="outline" className="text-[9px] px-1 py-0">You</Badge>}
                                        </p>
                                        {isLeader && (
                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Leader</Badge>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                        {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave "{group.group_name}"? You can always rejoin if the group is open.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveGroup} className="bg-destructive text-destructive-foreground">
                            Leave Group
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{group.group_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground">
                            {deleting ? 'Deleting...' : 'Delete Group'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={(open) => {
                setShowPaymentDialog(open);
                if (!open) {
                    setPaymentStep('form');
                    setPhoneNumber('');
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Group Payment</DialogTitle>
                        <DialogDescription>
                            Pay to activate premium access for all {currentMemberCount} members
                        </DialogDescription>
                    </DialogHeader>

                    {paymentStep === 'form' && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Members</span>
                                    <span className="font-medium">{currentMemberCount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Contribution per member</span>
                                    <span className="font-medium">{GROUPPAY_CONFIG.CURRENCY} {pricePerMember}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold pt-2 border-t">
                                    <span>Total Amount</span>
                                    <span className="text-green-600">{GROUPPAY_CONFIG.CURRENCY} {totalAmount}</span>
                                </div>
                                {!hasMinimumMembers && (
                                    <div className="flex items-center gap-2 text-xs text-amber-600">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>Need {membersNeeded} more members to reach {GROUPPAY_CONFIG.MIN_MEMBERS_REQUIRED}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                                    <Phone className="w-4 h-4" />
                                    M-Pesa Phone Number
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="0712345678"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    className="pl-9 text-base"
                                    maxLength={12}
                                />
                                <p className="text-xs text-muted-foreground">
                                    You will receive an STK push on this number
                                </p>
                            </div>

                            <Button
                                onClick={handleInitiatePayment}
                                disabled={processingPayment || !phoneNumber || !hasMinimumMembers}
                                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-base py-6"
                            >
                                {processingPayment ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Phone className="w-4 h-4 mr-2" />
                                        Pay {GROUPPAY_CONFIG.CURRENCY} {totalAmount} via M-Pesa
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                All {currentMemberCount} members will get premium access immediately after payment
                            </p>
                        </div>
                    )}

                    {paymentStep === 'processing' && (
                        <div className="py-8 text-center">
                            <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">Processing Payment</h3>
                            <p className="text-muted-foreground text-sm mt-2">
                                Please check your phone for the M-Pesa prompt
                            </p>
                        </div>
                    )}

                    {paymentStep === 'success' && (
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-lg font-semibold">Payment Initiated!</h3>
                            <p className="text-muted-foreground text-sm mt-2">
                                You will receive an M-Pesa prompt shortly.
                                All group members will be upgraded to premium automatically.
                            </p>
                        </div>
                    )}

                    {paymentStep === 'failed' && (
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold">Payment Failed</h3>
                            <p className="text-muted-foreground text-sm mt-2">
                                There was an error processing your payment. Please try again.
                            </p>
                            <Button
                                onClick={() => setPaymentStep('form')}
                                className="mt-4"
                            >
                                Try Again
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}