// src/pages/grouppay/[id].tsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { grouppayService } from '@/services/grouppayService';
import {
    StudyGroup,
    GroupPaymentStatus,
    GROUPPAY_CONFIG,
    GroupDuration,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from '@/types/grouppay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
    Info,
    MessageCircle,
    Mail,
    AlertTriangle,
    ExternalLink,
    Sparkles,
    PartyPopper,
    Rocket,
    ChevronLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { AddMember } from '@/components/grouppay/AddMember';
import { playSound } from '@/lib/soundManager';

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: 'light' | 'success' | 'warning' = 'light') => {
    playSound('ui-tap');
    if (type === 'success') vibrate([15, 30, 15]);
    else if (type === 'warning') vibrate(60);
    else vibrate(15);
};

export default function GroupDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const contentRef = useRef<HTMLDivElement | null>(null);

    const handleBack = useCallback(() => {
        tap();
        navigate('/grouppay', { replace: true });
    }, [navigate]);

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

    const playSuccessSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio('/sounds/Toast.mp3');
                audioRef.current.volume = 0.7;
            }
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { });
        } catch {
            /* ignore */
        }
    }, []);

    const triggerConfetti = useCallback(() => {
        try {
            const end = Date.now() + 3000;
            const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#e11d48', '#ec4899'];
            (function frame() {
                confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
                confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
                if (Date.now() < end) requestAnimationFrame(frame);
            })();
            setTimeout(() => confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors }), 100);
            setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.5, x: 0.3 }, colors }), 300);
            setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.5, x: 0.7 }, colors }), 500);
        } catch {
            /* ignore */
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

    useEffect(() => {
        if (id) {
            loadGroup();
            loadPaymentStatus();
        }
    }, [id]);

    const isCreator = user?.id === group?.created_by;
    const currentMemberCount = group?.current_members || 0;
    const maxMembers = group?.max_members || GROUPPAY_CONFIG.MAX_MEMBERS_LIMIT;

    const durationType: GroupDuration =
        group?.duration_type === '1-month' ? '1-month' : '2-months';

    const pricePerMember =
        group?.price_per_member ??
        group?.contribution_per_member ??
        getGroupPricePerMember(durationType);

    const individualPrice = getIndividualPrice(durationType);
    const savingsPerMember = getSavingsPerMember(durationType);

    const totalAmount = useMemo(
        () => currentMemberCount * pricePerMember,
        [currentMemberCount, pricePerMember]
    );

    const totalSavings = useMemo(
        () => currentMemberCount * savingsPerMember,
        [currentMemberCount, savingsPerMember]
    );

    const hasMinimumMembers = useMemo(
        () => currentMemberCount >= maxMembers,
        [currentMemberCount, maxMembers]
    );

    const isFull = useMemo(
        () => currentMemberCount >= maxMembers,
        [currentMemberCount, maxMembers]
    );

    const progress = useMemo(
        () => (currentMemberCount / maxMembers) * 100,
        [currentMemberCount, maxMembers]
    );

    const membersNeeded = useMemo(
        () => Math.max(0, maxMembers - currentMemberCount),
        [currentMemberCount, maxMembers]
    );

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
        tap('success');
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
        tap('warning');
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
        tap('warning');
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
        tap();
        navigator.clipboard.writeText(group.group_code);
        toast.success('Invite code copied to clipboard!');
    };

    const handleShareGroup = async () => {
        if (!group) return;
        tap();
        try {
            await navigator.share({
                title: `Join ${group.group_name} on Medrae GroupPay`,
                text: `Join our study group "${group.group_name}" using code: ${group.group_code}`,
                url: window.location.href,
            });
        } catch {
            /* cancelled */
        }
    };

    const handleInitiatePayment = async () => {
        if (!user) return toast.error('Please log in to make payment');
        if (!group) return toast.error('Group data not loaded');
        if (!phoneNumber || phoneNumber.length < 10) return toast.error('Please enter a valid phone number');
        if (!hasMinimumMembers) {
            toast.error(
                `Group needs ${membersNeeded} more member${membersNeeded > 1 ? 's' : ''} to activate`
            );
            return;
        }

        tap('success');
        setProcessingPayment(true);
        setPaymentStep('processing');

        try {
            await grouppayService.initiateGroupPayment(group.id, user.id, phoneNumber);
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
                        setShowPaymentDialog(false);
                        setPaymentStep('form');
                        setPhoneNumber('');
                        handleSuccess();
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
        tap();
        try {
            await grouppayService.retryGroupPayment(group.id, user.id);
            toast.success('Payment retry initiated');
            await loadPaymentStatus();
        } catch (error: any) {
            toast.error(error.message || 'Failed to retry payment');
        }
    };

    const durationLabel = durationType === '1-month' ? '1 Month' : '2 Months';

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* ── Header ─────────────────────────────────────── */}
            <header className="shrink-0 flex items-center gap-2 px-2 h-14
                               bg-white dark:bg-[#0d1117]
                               border-b border-slate-200/70 dark:border-white/[0.06]
                               z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10 rounded-full flex items-center justify-center
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5"
                    style={{ touchAction: 'manipulation' }}
                >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        {loading ? 'Loading group…' : group?.group_name ?? 'Group'}
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {loading
                            ? 'Please wait'
                            : group
                                ? `${currentMemberCount}/${maxMembers} members · ${group.status === 'active' ? 'Active' : 'Open'
                                }`
                                : 'Not found'}
                    </p>
                </div>
            </header>

            {/* ── Body ───────────────────────────────────────── */}
            <main
                ref={contentRef}
                className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain"
            >
                <div className="w-full max-w-3xl mx-auto px-4 py-4 pb-24 safe-bottom space-y-3">

                    {loading && <LoadingSkeleton />}

                    {!loading && !group && (
                        <div className="text-center max-w-sm mx-auto py-14">
                            <div className="h-14 w-14 rounded-full
                                            bg-slate-100 dark:bg-white/[0.06]
                                            flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Group not found
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                The group you're looking for doesn't exist or has been deleted.
                            </p>
                            <button
                                onClick={() => {
                                    tap();
                                    navigate('/grouppay');
                                }}
                                className="mt-5 h-10 px-4 rounded-xl
                                           bg-blue-600 text-white
                                           text-sm font-bold
                                           active:scale-[0.97] transition-transform"
                                style={{ touchAction: 'manipulation' }}
                            >
                                Browse groups
                            </button>
                        </div>
                    )}

                    {!loading && group && (
                        <>
                            {/* CELEBRATION OVERLAY */}
                            {showCelebration && (
                                <div className="fixed inset-0 z-[9998] pointer-events-none" />
                            )}

                            {showCelebrationModal && (
                                <CelebrationModal
                                    currentMemberCount={currentMemberCount}
                                    pricePerMember={pricePerMember}
                                    totalAmount={totalAmount}
                                    totalSavings={totalSavings}
                                    durationLabel={durationLabel}
                                    onClose={() => {
                                        tap();
                                        setShowCelebrationModal(false);
                                        setShowCelebration(false);
                                    }}
                                    onBrowse={() => {
                                        tap();
                                        setShowCelebrationModal(false);
                                        setShowCelebration(false);
                                        navigate('/grouppay');
                                    }}
                                />
                            )}

                            {/* ── HERO HEADER CARD ─────────────── */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-xl
                                                    bg-emerald-400/10
                                                    flex items-center justify-center shrink-0">
                                        <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                            {isCreator && (
                                                <span className="inline-flex items-center gap-1
                                                                 text-[10px] font-bold uppercase tracking-wider
                                                                 bg-amber-50 dark:bg-amber-400/10
                                                                 text-amber-700 dark:text-amber-400
                                                                 px-1.5 py-0.5 rounded-full">
                                                    <Crown className="h-2.5 w-2.5" />
                                                    Leader
                                                </span>
                                            )}
                                            {group.status === 'active' && (
                                                <span className="inline-flex items-center gap-1
                                                                 text-[10px] font-bold uppercase tracking-wider
                                                                 bg-emerald-50 dark:bg-emerald-400/10
                                                                 text-emerald-700 dark:text-emerald-400
                                                                 px-1.5 py-0.5 rounded-full">
                                                    <CheckCircle className="h-2.5 w-2.5" />
                                                    Active
                                                </span>
                                            )}
                                            <span
                                                className={`inline-flex items-center gap-1
                                                             text-[10px] font-bold uppercase tracking-wider
                                                             px-1.5 py-0.5 rounded-full
                                                             ${group.is_locked
                                                        ? 'bg-rose-50 dark:bg-rose-400/10 text-rose-700 dark:text-rose-400'
                                                        : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300'
                                                    }`}
                                            >
                                                {group.is_locked ? (
                                                    <Lock className="h-2.5 w-2.5" />
                                                ) : (
                                                    <Unlock className="h-2.5 w-2.5" />
                                                )}
                                                {group.is_locked ? 'Locked' : 'Open'}
                                            </span>
                                        </div>
                                        <h2 className="text-base font-bold leading-tight
                                                       text-slate-900 dark:text-white truncate">
                                            {group.group_name}
                                        </h2>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                            {group.school}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center
                                                     text-[10px] font-bold uppercase tracking-wider
                                                     bg-violet-50 dark:bg-violet-400/10
                                                     text-violet-700 dark:text-violet-400
                                                     px-2 py-0.5 rounded-full">
                                        {durationLabel}
                                    </span>
                                    <span className="inline-flex items-center
                                                     text-[10px] font-bold uppercase tracking-wider
                                                     bg-emerald-50 dark:bg-emerald-400/10
                                                     text-emerald-700 dark:text-emerald-400
                                                     px-2 py-0.5 rounded-full">
                                        Save {GROUPPAY_CONFIG.CURRENCY} {savingsPerMember}/person
                                    </span>
                                </div>

                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-3
                                                text-[11px] text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-3 w-3" />
                                        <span>
                                            {group.creator?.name || 'Unknown'}
                                            {isCreator && (
                                                <span className="ml-1 opacity-70">(You)</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            {formatDistanceToNow(new Date(group.created_at), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                {group.description && (
                                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3">
                                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {group.description}
                                        </p>
                                    </div>
                                )}
                            </section>

                            {/* ── CONTACT ──────────────────────── */}
                            {(group.leader_phone ||
                                group.leader_whatsapp ||
                                group.leader_email) && (
                                    <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg
                                                        bg-blue-400/10
                                                        flex items-center justify-center shrink-0">
                                                <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wider
                                                          text-blue-600 dark:text-blue-400 leading-none mb-1">
                                                    Contributions
                                                </p>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                    Group leader contact
                                                </h3>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                            Send your contribution ({GROUPPAY_CONFIG.CURRENCY}{' '}
                                            {pricePerMember}) directly to the leader.
                                        </p>

                                        <div className="space-y-2">
                                            {group.leader_phone && (
                                                <ContactRow
                                                    icon={<Phone className="h-3.5 w-3.5" />}
                                                    label="Phone"
                                                    value={group.leader_phone}
                                                    actions={
                                                        <>
                                                            <MiniBtn
                                                                icon={<Phone className="h-3.5 w-3.5" />}
                                                                label="Call"
                                                                onClick={() =>
                                                                    handlePhoneClick(group.leader_phone || '')
                                                                }
                                                            />
                                                            <MiniBtn
                                                                icon={<Copy className="h-3.5 w-3.5" />}
                                                                label="Copy"
                                                                onClick={() => {
                                                                    tap();
                                                                    navigator.clipboard.writeText(
                                                                        group.leader_phone || ''
                                                                    );
                                                                    toast.success('Phone number copied!');
                                                                }}
                                                            />
                                                        </>
                                                    }
                                                />
                                            )}
                                            {group.leader_whatsapp && (
                                                <ContactRow
                                                    icon={<MessageCircle className="h-3.5 w-3.5" />}
                                                    label="WhatsApp"
                                                    value={group.leader_whatsapp}
                                                    actions={
                                                        <MiniBtn
                                                            icon={<ExternalLink className="h-3.5 w-3.5" />}
                                                            label="Chat"
                                                            onClick={() =>
                                                                handleWhatsAppClick(group.leader_whatsapp || '')
                                                            }
                                                        />
                                                    }
                                                />
                                            )}
                                            {group.leader_email && (
                                                <ContactRow
                                                    icon={<Mail className="h-3.5 w-3.5" />}
                                                    label="Email"
                                                    value={group.leader_email}
                                                    actions={
                                                        <MiniBtn
                                                            icon={<Mail className="h-3.5 w-3.5" />}
                                                            label="Email"
                                                            onClick={() =>
                                                                handleEmailClick(group.leader_email || '')
                                                            }
                                                        />
                                                    }
                                                />
                                            )}
                                        </div>

                                        <InfoCallout
                                            tone="amber"
                                            icon={<AlertTriangle className="h-3.5 w-3.5" />}
                                            body="Only send money to group leaders you know personally. Medrae does not handle individual contributions."
                                        />
                                    </section>
                                )}

                            {/* ── PROGRESS ─────────────────────── */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <span className="text-[11px] font-bold uppercase tracking-wider
                                                         text-slate-500 dark:text-slate-400">
                                            Members
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                                        {currentMemberCount}/{maxMembers}
                                    </span>
                                </div>

                                <Progress value={Math.min(progress, 100)} className="h-1.5" />

                                <div
                                    className={`flex items-start gap-1.5 text-[11px] leading-snug ${hasMinimumMembers
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                        }`}
                                >
                                    {hasMinimumMembers ? (
                                        <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                    )}
                                    <span>
                                        {hasMinimumMembers
                                            ? 'Ready — group is full, activate any time'
                                            : `Need ${membersNeeded} more member${membersNeeded > 1 ? 's' : ''
                                            } to fill the group`}
                                    </span>
                                </div>

                                {/* Pricing 3-up */}
                                <div className="grid grid-cols-3 gap-1.5 pt-1">
                                    <MiniStat
                                        label="Per member"
                                        value={`${GROUPPAY_CONFIG.CURRENCY} ${pricePerMember}`}
                                        sub={`${GROUPPAY_CONFIG.CURRENCY} ${individualPrice} solo`}
                                    />
                                    <MiniStat
                                        label="Members"
                                        value={`${currentMemberCount}`}
                                    />
                                    <MiniStat
                                        label="Total"
                                        value={`${GROUPPAY_CONFIG.CURRENCY} ${totalAmount}`}
                                        tone="emerald"
                                        sub={`Save ${GROUPPAY_CONFIG.CURRENCY} ${totalSavings.toLocaleString()}`}
                                    />
                                </div>
                            </section>

                            {/* ── PAYMENT STATUS ──────────────── */}
                            {paymentStatus && (
                                <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-bold uppercase tracking-wider
                                                      text-slate-500 dark:text-slate-400">
                                            Payment status
                                        </p>
                                        <PaymentBadge status={paymentStatus} />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Total amount
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                                            {GROUPPAY_CONFIG.CURRENCY} {paymentStatus.total_amount}
                                        </span>
                                    </div>

                                    {paymentStatus.mpesa_receipt && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Receipt
                                            </span>
                                            <code className="text-[11px] font-mono tabular-nums
                                                             bg-slate-100 dark:bg-white/[0.06]
                                                             px-1.5 py-0.5 rounded">
                                                {paymentStatus.mpesa_receipt}
                                            </code>
                                        </div>
                                    )}

                                    {paymentStatus.result_desc &&
                                        paymentStatus.status === 'failed' && (
                                            <div className="flex items-start gap-1.5 p-2 rounded-lg
                                                            bg-rose-50 dark:bg-rose-400/10
                                                            text-[11px] text-rose-700 dark:text-rose-400 leading-snug">
                                                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                                <span>{paymentStatus.result_desc}</span>
                                            </div>
                                        )}

                                    {paymentStatus.status === 'failed' && isCreator && (
                                        <button
                                            onClick={handleRetryPayment}
                                            className="w-full h-9 rounded-xl
                                                       bg-slate-100 dark:bg-white/[0.06]
                                                       text-slate-700 dark:text-slate-200
                                                       text-[12px] font-bold
                                                       flex items-center justify-center gap-1.5
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Retry payment
                                        </button>
                                    )}
                                </section>
                            )}

                            {/* ── CODE / SHARE ────────────────── */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider
                                                      text-slate-500 dark:text-slate-400 leading-none mb-1">
                                            Invite code
                                        </p>
                                        <code className="text-lg font-bold tabular-nums tracking-widest
                                                         text-slate-900 dark:text-white">
                                            {group.group_code}
                                        </code>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <IconBtn
                                            icon={<Copy className="h-4 w-4" />}
                                            label="Copy"
                                            onClick={handleCopyInviteCode}
                                        />
                                        <IconBtn
                                            icon={<Share2 className="h-4 w-4" />}
                                            label="Share"
                                            onClick={handleShareGroup}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* ── ACTIONS ──────────────────────── */}
                            <section className="space-y-2">
                                {!isMember && !isFull && group.status !== 'closed' && !group.is_locked && (
                                    <button
                                        onClick={handleJoinGroup}
                                        disabled={joining}
                                        className="w-full h-11 rounded-xl
                                                   bg-blue-600 text-white
                                                   text-sm font-bold
                                                   flex items-center justify-center gap-2
                                                   active:scale-[0.97] transition-transform
                                                   disabled:opacity-60"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        {joining ? 'Joining…' : 'Join group'}
                                    </button>
                                )}

                                {isMember && !isCreator && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                tap('warning');
                                                setShowLeaveDialog(true);
                                            }}
                                            disabled={leaving}
                                            className="h-11 rounded-xl
                                                       bg-slate-100 dark:bg-white/[0.06]
                                                       text-slate-700 dark:text-slate-200
                                                       text-sm font-bold
                                                       flex items-center justify-center gap-1.5
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <UserMinus className="h-4 w-4" />
                                            Leave
                                        </button>
                                        <button
                                            onClick={() => {
                                                tap();
                                                setShowPaymentDialog(true);
                                            }}
                                            disabled={
                                                group.status === 'active' || !hasMinimumMembers
                                            }
                                            className={`h-11 rounded-xl text-white
                                                        text-sm font-bold
                                                        flex items-center justify-center gap-1.5
                                                        transition-transform
                                                        ${group.status === 'active' ||
                                                    !hasMinimumMembers
                                                    ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-400 cursor-not-allowed'
                                                    : 'bg-emerald-600 active:scale-[0.97]'
                                                }`}
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <DollarSign className="h-4 w-4" />
                                            {group.status === 'active' ? 'Active' : 'Pay'}
                                        </button>
                                    </div>
                                )}

                                {isCreator && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                tap('warning');
                                                setShowDeleteDialog(true);
                                            }}
                                            disabled={deleting}
                                            className="h-11 rounded-xl
                                                       bg-rose-50 dark:bg-rose-400/10
                                                       text-rose-700 dark:text-rose-400
                                                       text-sm font-bold
                                                       flex items-center justify-center gap-1.5
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>

                                        <button
                                            onClick={() => {
                                                tap();
                                                setShowPaymentDialog(true);
                                            }}
                                            disabled={
                                                group.status === 'active' || !hasMinimumMembers
                                            }
                                            className={`h-11 rounded-xl text-white
                                                        text-sm font-bold
                                                        flex items-center justify-center gap-1.5
                                                        transition-transform
                                                        ${group.status === 'active' ||
                                                    !hasMinimumMembers
                                                    ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-400 cursor-not-allowed'
                                                    : 'bg-emerald-600 active:scale-[0.97]'
                                                }`}
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <DollarSign className="h-4 w-4" />
                                            {group.status === 'active' ? 'Active' : 'Pay'}
                                        </button>
                                    </div>
                                )}

                                {isCreator &&
                                    group.status === 'open' &&
                                    !group.is_locked &&
                                    !isFull && (
                                        <AddMember
                                            groupId={group.id}
                                            existingMemberIds={(group.members ?? []).map(
                                                (m) => m.user_id
                                            )}
                                            currentMemberCount={currentMemberCount}
                                            maxMembers={maxMembers}
                                            onMemberAdded={loadGroup}
                                        />
                                    )}

                                {isFull && !isMember && (
                                    <div className="rounded-xl bg-slate-100 dark:bg-white/[0.06] p-3 text-center
                                                    text-[11px] font-bold uppercase tracking-wider
                                                    text-slate-500 dark:text-slate-400">
                                        Group full
                                    </div>
                                )}
                                {group.is_locked && !isMember && (
                                    <div className="rounded-xl bg-rose-50 dark:bg-rose-400/10 p-3 text-center
                                                    text-[11px] font-bold uppercase tracking-wider
                                                    text-rose-700 dark:text-rose-400">
                                        Locked
                                    </div>
                                )}
                                {group.status === 'closed' && !isMember && (
                                    <div className="rounded-xl bg-slate-100 dark:bg-white/[0.06] p-3 text-center
                                                    text-[11px] font-bold uppercase tracking-wider
                                                    text-slate-500 dark:text-slate-400">
                                        Closed
                                    </div>
                                )}
                            </section>

                            {/* Fill-up warning */}
                            {isCreator &&
                                !hasMinimumMembers &&
                                group.status !== 'active' && (
                                    <InfoCallout
                                        tone="amber"
                                        icon={<Info className="h-3.5 w-3.5" />}
                                        title={`Need ${membersNeeded} more member${membersNeeded > 1 ? 's' : ''
                                            }`}
                                        body={`Your group activates once all ${maxMembers} slots are filled. Share the code with friends.`}
                                    />
                                )}

                            {/* ── MEMBERS LIST ─────────────────── */}
                            <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg
                                                        bg-violet-400/10
                                                        flex items-center justify-center shrink-0">
                                            <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider
                                                          text-violet-600 dark:text-violet-400 leading-none mb-1">
                                                Members
                                            </p>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                {currentMemberCount}/{maxMembers}
                                            </h3>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    {group.members?.map((member) => {
                                        const isLeader = member.role === 'leader';
                                        const isCurrentUser = member.user_id === user?.id;
                                        return (
                                            <div
                                                key={member.id}
                                                className="flex items-center gap-2.5 p-2 rounded-xl
                                                           bg-slate-50 dark:bg-[#0d1117]"
                                            >
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarImage src={member.profile?.avatar_url} />
                                                    <AvatarFallback className="text-[11px] font-bold
                                                                             bg-slate-200 dark:bg-white/[0.1]
                                                                             text-slate-600 dark:text-slate-300">
                                                        {member.profile?.name?.charAt(0) || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-bold flex items-center gap-1.5 truncate
                                                                  text-slate-900 dark:text-white">
                                                        <span className="truncate">
                                                            {member.profile?.name || 'Unknown'}
                                                        </span>
                                                        {isLeader && (
                                                            <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                                                        )}
                                                        {isCurrentUser && (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider
                                                                             text-slate-400 dark:text-slate-500 shrink-0">
                                                                You
                                                            </span>
                                                        )}
                                                    </p>
                                                    {isLeader && (
                                                        <p className="text-[10px] font-bold uppercase tracking-wider
                                                                      text-amber-600 dark:text-amber-400 mt-0.5">
                                                            Leader
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                                    {formatDistanceToNow(
                                                        new Date(member.joined_at),
                                                        { addSuffix: true }
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>

            {/* ── DIALOGS ─────────────────────────────────────── */}
            {group && (
                <>
                    <AlertDialog
                        open={showLeaveDialog}
                        onOpenChange={setShowLeaveDialog}
                    >
                        <AlertDialogContent className="border-0 rounded-2xl
                                                       bg-white dark:bg-[#161b22]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Leave group?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Leave "{group.group_name}"? You can rejoin if the group is
                                    still open.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel
                                    className="h-10 rounded-xl border-0
                                               bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-700 dark:text-slate-200 text-sm font-bold"
                                >
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleLeaveGroup}
                                    className="h-10 rounded-xl border-0
                                               bg-rose-600 text-white text-sm font-bold"
                                >
                                    Leave group
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog
                        open={showDeleteDialog}
                        onOpenChange={setShowDeleteDialog}
                    >
                        <AlertDialogContent className="border-0 rounded-2xl
                                                       bg-white dark:bg-[#161b22]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete group?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Delete "{group.group_name}"? This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel
                                    className="h-10 rounded-xl border-0
                                               bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-700 dark:text-slate-200 text-sm font-bold"
                                >
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteGroup}
                                    className="h-10 rounded-xl border-0
                                               bg-rose-600 text-white text-sm font-bold"
                                >
                                    {deleting ? 'Deleting…' : 'Delete group'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Payment dialog — fixed footer */}
                    {showPaymentDialog && (
                        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6">
                            <div
                                className="absolute inset-0 bg-black/60"
                                onClick={() => {
                                    if (processingPayment) return;
                                    setShowPaymentDialog(false);
                                    setPaymentStep('form');
                                    setPhoneNumber('');
                                }}
                                style={{ touchAction: 'manipulation' }}
                            />
                            <div className="relative w-full sm:max-w-md
                                            bg-white dark:bg-[#161b22]
                                            rounded-t-2xl sm:rounded-2xl
                                            flex flex-col
                                            max-h-[92dvh] sm:max-h-[85vh]
                                            overflow-hidden
                                            pb-[env(safe-area-inset-bottom)] sm:pb-0">
                                <header className="shrink-0 flex items-center gap-2 px-2 h-14
                                                   border-b border-slate-200/70 dark:border-white/[0.06]">
                                    <button
                                        onClick={() => {
                                            if (processingPayment) return;
                                            tap();
                                            setShowPaymentDialog(false);
                                            setPaymentStep('form');
                                            setPhoneNumber('');
                                        }}
                                        className="h-10 w-10 rounded-full flex items-center justify-center
                                                   text-slate-700 dark:text-slate-200
                                                   active:bg-slate-100 dark:active:bg-white/5"
                                        style={{ touchAction: 'manipulation' }}
                                        aria-label="Close"
                                    >
                                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <h1 className="text-base font-bold leading-tight truncate">
                                            Group payment
                                        </h1>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                                            {durationLabel} for {currentMemberCount} members
                                        </p>
                                    </div>
                                </header>

                                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">
                                    {paymentStep === 'form' && (
                                        <>
                                            <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3 space-y-2">
                                                <SummaryRow
                                                    label="Plan"
                                                    value={durationLabel}
                                                />
                                                <SummaryRow
                                                    label="Members"
                                                    value={String(currentMemberCount)}
                                                />
                                                <SummaryRow
                                                    label="Per member"
                                                    value={`${GROUPPAY_CONFIG.CURRENCY} ${pricePerMember}`}
                                                    strike={`${GROUPPAY_CONFIG.CURRENCY} ${individualPrice}`}
                                                />
                                                <div className="h-px bg-slate-200/60 dark:bg-white/[0.06] my-1" />
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                        Total
                                                    </span>
                                                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                        {GROUPPAY_CONFIG.CURRENCY} {totalAmount}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400">
                                                    <span>You save</span>
                                                    <span className="font-bold tabular-nums">
                                                        {GROUPPAY_CONFIG.CURRENCY}{' '}
                                                        {totalSavings.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="phone"
                                                    className="text-[11px] font-bold uppercase tracking-wider
                                                               text-slate-500 dark:text-slate-400
                                                               flex items-center gap-1.5"
                                                >
                                                    <Phone className="h-3 w-3" />
                                                    M-Pesa phone number
                                                </Label>
                                                <Input
                                                    id="phone"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    placeholder="0712345678"
                                                    value={phoneNumber}
                                                    onChange={(e) =>
                                                        setPhoneNumber(
                                                            e.target.value.replace(/\D/g, '')
                                                        )
                                                    }
                                                    className="text-base h-11 rounded-xl border-0
                                                               bg-slate-50 dark:bg-[#0d1117]
                                                               focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                                                    maxLength={12}
                                                />
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                                    You will receive an STK push on this number.
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {paymentStep === 'processing' && (
                                        <div className="py-8 text-center space-y-3">
                                            <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto" />
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Processing payment
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                                Check your phone for the M-Pesa prompt.
                                            </p>
                                        </div>
                                    )}

                                    {paymentStep === 'success' && (
                                        <div className="py-8 text-center space-y-3">
                                            <div className="h-14 w-14 rounded-full
                                                            bg-emerald-50 dark:bg-emerald-400/10
                                                            flex items-center justify-center mx-auto">
                                                <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Payment initiated
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                                All {currentMemberCount} members will be upgraded
                                                automatically once M-Pesa confirms.
                                            </p>
                                        </div>
                                    )}

                                    {paymentStep === 'failed' && (
                                        <div className="py-8 text-center space-y-3">
                                            <div className="h-14 w-14 rounded-full
                                                            bg-rose-50 dark:bg-rose-400/10
                                                            flex items-center justify-center mx-auto">
                                                <AlertCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                Payment failed
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                                Something went wrong. Please try again.
                                            </p>
                                        </div>
                                    )}
                                </main>

                                <footer className="shrink-0 px-4 py-3
                                                   border-t border-slate-200/70 dark:border-white/[0.06]">
                                    {paymentStep === 'form' && (
                                        <button
                                            onClick={handleInitiatePayment}
                                            disabled={
                                                processingPayment ||
                                                !phoneNumber ||
                                                !hasMinimumMembers
                                            }
                                            className={`w-full h-11 rounded-xl text-white
                                                        text-sm font-bold
                                                        flex items-center justify-center gap-2
                                                        transition-transform
                                                        ${processingPayment ||
                                                    !phoneNumber ||
                                                    !hasMinimumMembers
                                                    ? 'bg-slate-200 dark:bg-white/[0.08] text-slate-400 cursor-not-allowed'
                                                    : 'bg-emerald-600 active:scale-[0.97]'
                                                }`}
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            <Phone className="h-4 w-4" />
                                            Pay {GROUPPAY_CONFIG.CURRENCY} {totalAmount}
                                        </button>
                                    )}
                                    {paymentStep === 'processing' && (
                                        <button
                                            disabled
                                            className="w-full h-11 rounded-xl
                                                       bg-slate-100 dark:bg-white/[0.06]
                                                       text-slate-500 dark:text-slate-400
                                                       text-sm font-bold"
                                        >
                                            Waiting for M-Pesa…
                                        </button>
                                    )}
                                    {paymentStep === 'success' && (
                                        <button
                                            onClick={() => {
                                                tap();
                                                setShowPaymentDialog(false);
                                                setPaymentStep('form');
                                                setPhoneNumber('');
                                            }}
                                            className="w-full h-11 rounded-xl
                                                       bg-slate-100 dark:bg-white/[0.06]
                                                       text-slate-700 dark:text-slate-200
                                                       text-sm font-bold
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            Close
                                        </button>
                                    )}
                                    {paymentStep === 'failed' && (
                                        <button
                                            onClick={() => {
                                                tap();
                                                setPaymentStep('form');
                                            }}
                                            className="w-full h-11 rounded-xl
                                                       bg-emerald-600 text-white
                                                       text-sm font-bold
                                                       active:scale-[0.97] transition-transform"
                                            style={{ touchAction: 'manipulation' }}
                                        >
                                            Try again
                                        </button>
                                    )}
                                </footer>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                     */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            <div className="h-40 rounded-2xl bg-white dark:bg-[#161b22]" />
            <div className="h-32 rounded-2xl bg-white dark:bg-[#161b22]" />
            <div className="h-32 rounded-2xl bg-white dark:bg-[#161b22]" />
        </div>
    );
}

function SummaryRow({
    label,
    value,
    strike,
}: {
    label: string;
    value: string;
    strike?: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {label}
            </span>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
                {value}
                {strike && (
                    <span className="ml-1.5 text-[10px] line-through opacity-60 text-slate-400 dark:text-slate-500">
                        {strike}
                    </span>
                )}
            </span>
        </div>
    );
}

function ContactRow({
    icon,
    label,
    value,
    actions,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    actions: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2 p-2 rounded-xl
                        bg-slate-50 dark:bg-[#0d1117]">
            <span className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider
                              text-slate-500 dark:text-slate-400 leading-none mb-0.5">
                    {label}
                </p>
                <p className="text-[12px] font-mono font-bold tabular-nums
                              text-slate-900 dark:text-white truncate">
                    {value}
                </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">{actions}</div>
        </div>
    );
}

function MiniBtn({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="h-8 px-2 rounded-lg
                       bg-white dark:bg-white/[0.06]
                       text-[10px] font-bold uppercase tracking-wider
                       text-slate-600 dark:text-slate-300
                       flex items-center gap-1
                       active:scale-[0.92] transition-transform"
            style={{ touchAction: 'manipulation' }}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

function IconBtn({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="h-10 px-3 rounded-xl
                       bg-slate-100 dark:bg-white/[0.06]
                       text-slate-700 dark:text-slate-200
                       text-[11px] font-bold
                       flex items-center gap-1.5
                       active:scale-[0.97] transition-transform"
            style={{ touchAction: 'manipulation' }}
        >
            {icon}
            {label}
        </button>
    );
}

function MiniStat({
    label,
    value,
    sub,
    tone,
}: {
    label: string;
    value: string;
    sub?: string;
    tone?: 'emerald';
}) {
    const valueColor =
        tone === 'emerald'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-900 dark:text-white';
    return (
        <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-2.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider
                          text-slate-500 dark:text-slate-400 leading-none mb-1">
                {label}
            </p>
            <p className={`text-[12px] font-bold tabular-nums ${valueColor}`}>
                {value}
            </p>
            {sub && (
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                    {sub}
                </p>
            )}
        </div>
    );
}

function PaymentBadge({ status }: { status: GroupPaymentStatus }) {
    const isSuccess = status.is_successful;
    const isPending = status.status === 'pending';
    const cls = isSuccess
        ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400'
        : isPending
            ? 'bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400'
            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300';

    return (
        <span
            className={`inline-flex items-center gap-1
                        text-[10px] font-bold uppercase tracking-wider
                        px-1.5 py-0.5 rounded-full ${cls}`}
        >
            {isSuccess ? (
                <CheckCircle className="h-2.5 w-2.5" />
            ) : isPending ? (
                <Clock className="h-2.5 w-2.5" />
            ) : (
                <AlertCircle className="h-2.5 w-2.5" />
            )}
            {status.status}
        </span>
    );
}

type Tone = 'amber' | 'rose' | 'blue' | 'emerald';

function InfoCallout({
    tone,
    icon,
    title,
    body,
}: {
    tone: Tone;
    icon: React.ReactNode;
    title?: string;
    body: React.ReactNode;
}) {
    const styles: Record<Tone, { bg: string; text: string; body: string }> = {
        amber: {
            bg: 'bg-amber-50 dark:bg-amber-400/10',
            text: 'text-amber-700 dark:text-amber-400',
            body: 'text-amber-700/80 dark:text-amber-300/80',
        },
        rose: {
            bg: 'bg-rose-50 dark:bg-rose-400/10',
            text: 'text-rose-700 dark:text-rose-400',
            body: 'text-rose-700/80 dark:text-rose-300/80',
        },
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-400/10',
            text: 'text-blue-700 dark:text-blue-400',
            body: 'text-blue-700/80 dark:text-blue-300/80',
        },
        emerald: {
            bg: 'bg-emerald-50 dark:bg-emerald-400/10',
            text: 'text-emerald-700 dark:text-emerald-400',
            body: 'text-emerald-700/80 dark:text-emerald-300/80',
        },
    };
    const s = styles[tone];
    return (
        <div className={`rounded-xl p-3 ${s.bg}`}>
            <div className="flex items-start gap-2">
                <span className={`shrink-0 mt-0.5 ${s.text}`}>{icon}</span>
                <div className="min-w-0 flex-1">
                    {title && (
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${s.text} mb-1`}>
                            {title}
                        </p>
                    )}
                    <div className={`text-[11px] leading-relaxed ${s.body}`}>
                        {body}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CelebrationModal({
    currentMemberCount,
    pricePerMember,
    totalAmount,
    totalSavings,
    durationLabel,
    onClose,
    onBrowse,
}: {
    currentMemberCount: number;
    pricePerMember: number;
    totalAmount: number;
    totalSavings: number;
    durationLabel: string;
    onClose: () => void;
    onBrowse: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6">
            <div className="absolute inset-0 bg-black/60" style={{ touchAction: 'manipulation' }} />
            <div className="relative w-full sm:max-w-md
                            bg-white dark:bg-[#161b22]
                            rounded-t-2xl sm:rounded-2xl
                            flex flex-col
                            max-h-[92dvh] sm:max-h-[85vh]
                            overflow-hidden">
                <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar
                                 px-5 pt-6 pb-4 text-center space-y-4">
                    <div className="h-16 w-16 rounded-2xl
                                    bg-emerald-50 dark:bg-emerald-400/10
                                    flex items-center justify-center mx-auto">
                        <PartyPopper className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider
                                      text-emerald-600 dark:text-emerald-400 mb-1">
                            Success
                        </p>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                            Group activated
                        </h2>
                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                            {durationLabel} premium unlocked for all {currentMemberCount}{' '}
                            members
                        </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-[#0d1117] p-3
                                    grid grid-cols-3 gap-2">
                        <MiniStat label="Members" value={String(currentMemberCount)} />
                        <MiniStat
                            label="Per member"
                            value={`${GROUPPAY_CONFIG.CURRENCY} ${pricePerMember}`}
                        />
                        <MiniStat
                            label="Total"
                            value={`${GROUPPAY_CONFIG.CURRENCY} ${totalAmount}`}
                            tone="emerald"
                        />
                    </div>

                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-400/10 p-3
                                    flex items-start gap-2 text-left">
                        <Rocket className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug">
                            Saved {GROUPPAY_CONFIG.CURRENCY}{' '}
                            {totalSavings.toLocaleString()} vs {durationLabel} solo plans
                        </p>
                    </div>
                </main>

                <footer className="shrink-0 px-4 py-3 space-y-2
                                   border-t border-slate-200/70 dark:border-white/[0.06]">
                    <button
                        onClick={onClose}
                        className="w-full h-11 rounded-xl
                                   bg-emerald-600 text-white
                                   text-sm font-bold
                                   flex items-center justify-center gap-2
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <CheckCircle className="h-4 w-4" />
                        Awesome, let's go
                    </button>
                    <button
                        onClick={onBrowse}
                        className="w-full h-10 rounded-xl
                                   bg-slate-100 dark:bg-white/[0.06]
                                   text-slate-700 dark:text-slate-200
                                   text-sm font-bold
                                   flex items-center justify-center gap-2
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <Users className="h-4 w-4" />
                        Browse groups
                    </button>
                </footer>
            </div>
        </div>
    );
}