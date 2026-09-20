// src/components/grouppay/GroupCard.tsx

import {
    StudyGroup,
    GROUPPAY_CONFIG,
    GroupDuration,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from '@/types/grouppay';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    User,
    Lock,
    Unlock,
    Calendar,
    Crown,
    Phone,
    Sparkles,
    TrendingDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface GroupCardProps {
    group: StudyGroup;
    onJoin?: (groupId: string) => void;
    isMember?: boolean;
    userRole?: 'leader' | 'member' | null;
    currentUserId?: string;
}

export function GroupCard({
    group,
    onJoin,
    isMember,
    userRole,
    currentUserId,
}: GroupCardProps) {
    const navigate = useNavigate();

    // ============================================================
    // ✅ ALL VALUES DERIVED — no hardcoded numbers anywhere
    // ============================================================
    const durationType: GroupDuration =
        group.duration_type === '1-month' ? '1-month' : '2-months';

    const durationLabel = durationType === '1-month' ? '1 Month' : '2 Months';

    // Prefer DB values; fall back to helpers only if DB rows are missing
    const pricePerMember =
        group.price_per_member ??
        group.contribution_per_member ??
        getGroupPricePerMember(durationType);

    const individualPrice = getIndividualPrice(durationType);
    const savingsPerMember = getSavingsPerMember(durationType);

    const currentMembers = group.current_members ?? 0;
    const maxMembers = group.max_members ?? 0;

    const progress =
        maxMembers > 0 ? (currentMembers / maxMembers) * 100 : 0;

    const isFull = currentMembers >= maxMembers && maxMembers > 0;

    // ✅ Simple model: group is ready when full
    const readyToActivate = isFull && group.status !== 'active';

    const isCreator = currentUserId === group.created_by;
    const memberStatus =
        isMember !== undefined
            ? isMember
            : group.members?.some((m) => m.user_id === currentUserId) || false;
    const role =
        userRole ||
        group.members?.find((m) => m.user_id === currentUserId)?.role ||
        null;

    const hasContactInfo = !!(
        group.leader_phone ||
        group.leader_whatsapp ||
        group.leader_email
    );

    // ============================================================
    // STATUS BADGE — quiet, borderless palette
    // ============================================================
    const statusStyles: Record<typeof group.status, string> = {
        open: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
        payment_pending:
            'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        active:
            'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
        closed:
            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };

    const statusIconFor = (status: typeof group.status) => {
        // Reuse existing icons we already import; keeps bundle small
        switch (status) {
            case 'active':
                return <Sparkles className="w-3 h-3 mr-1" />;
            case 'payment_pending':
                return <Calendar className="w-3 h-3 mr-1" />;
            case 'closed':
                return <Lock className="w-3 h-3 mr-1" />;
            default:
                return null;
        }
    };

    const handleCardClick = () => {
        navigate(`/grouppay/${group.id}`);
    };

    const handleJoinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onJoin) {
            onJoin(group.id);
        }
    };

    return (
        <Card
            className="group rounded-2xl border-0 shadow-none
                bg-white dark:bg-muted/30
                hover:bg-slate-50 dark:hover:bg-muted/40
                transition-colors cursor-pointer overflow-hidden"
            onClick={handleCardClick}
        >
            {/* Top accent — reflects status subtly */}
            <div
                className={`h-1 w-full ${group.status === 'active'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : group.status === 'payment_pending'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : group.status === 'closed'
                            ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                            : 'bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500'
                    }`}
            />

            <CardHeader className="space-y-2 pb-3 px-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base md:text-lg font-bold leading-tight line-clamp-1 text-slate-900 dark:text-white">
                            {group.group_name}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {group.school}
                        </p>

                        {/* Duration + savings mini-badges */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge className="border-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[9px] md:text-[10px] font-semibold">
                                {durationLabel}
                            </Badge>
                            {savingsPerMember > 0 && (
                                <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] md:text-[10px] font-semibold flex items-center gap-0.5">
                                    <TrendingDown className="w-2.5 h-2.5" />
                                    Save {GROUPPAY_CONFIG.CURRENCY} {savingsPerMember}
                                </Badge>
                            )}
                            {readyToActivate && (
                                <Badge className="border-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] md:text-[10px] font-bold flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Ready
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Lock badge — compact, borderless */}
                    <Badge
                        className={`shrink-0 border-0 text-[9px] md:text-[10px] font-semibold px-2 py-0.5 ${group.is_locked
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                    >
                        {group.is_locked ? (
                            <Lock className="w-2.5 h-2.5 mr-1" />
                        ) : (
                            <Unlock className="w-2.5 h-2.5 mr-1" />
                        )}
                        {group.is_locked ? 'Locked' : 'Open'}
                    </Badge>
                </div>

                {/* Creator + contact indicator */}
                <div className="flex items-center text-[11px] md:text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                    <span className="line-clamp-1">
                        Created by {group.creator?.name || 'Unknown'}
                    </span>
                    {isCreator && (
                        <Crown className="w-3.5 h-3.5 ml-1.5 text-yellow-500 flex-shrink-0" />
                    )}
                    {hasContactInfo && (
                        <Phone className="w-3 h-3 ml-1.5 text-green-500 flex-shrink-0" />
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-3 pb-3 px-4">
                {/* Members + time */}
                <div className="flex items-center justify-between text-xs md:text-sm">
                    <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                        <span className="font-medium tabular-nums text-slate-900 dark:text-white">
                            {currentMembers}
                            <span className="text-muted-foreground font-normal">
                                {' / '}
                                {maxMembers}
                            </span>
                        </span>
                    </div>
                    <span className="text-[10px] md:text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(group.created_at), {
                            addSuffix: true,
                        })}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                    <Progress
                        value={Math.min(progress, 100)}
                        className="h-1.5"
                    />
                    <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                        <span>
                            {isFull
                                ? 'Group is full'
                                : `${maxMembers - currentMembers} slot${maxMembers - currentMembers !== 1 ? 's' : ''
                                } left`}
                        </span>
                        <span className="tabular-nums">
                            {Math.round(progress)}%
                        </span>
                    </div>
                </div>

                {/* Description */}
                {group.description && (
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {group.description}
                    </p>
                )}

                {/* Price row — all derived, no hardcoding */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border-0">
                    <span className="text-[11px] md:text-xs text-muted-foreground">
                        Per member
                    </span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-sm md:text-base font-bold text-green-600 dark:text-green-400 tabular-nums">
                            {GROUPPAY_CONFIG.CURRENCY} {pricePerMember}
                        </span>
                        {individualPrice > pricePerMember && (
                            <span className="text-[10px] md:text-xs text-muted-foreground line-through opacity-60 tabular-nums">
                                {GROUPPAY_CONFIG.CURRENCY} {individualPrice}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status badge — quiet, only when not "open" (open is default state) */}
                {group.status !== 'open' && (
                    <Badge
                        className={`border-0 text-[10px] md:text-[11px] font-semibold ${statusStyles[group.status]}`}
                    >
                        {statusIconFor(group.status)}
                        {group.status.replace('_', ' ')}
                    </Badge>
                )}
            </CardContent>

            <CardFooter className="flex justify-between items-center px-4 pb-4 pt-0 border-0 bg-transparent">
                <div className="text-[10px] md:text-xs text-muted-foreground">
                    Code:{' '}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {group.group_code}
                    </span>
                </div>

                {/* Action area */}
                {!memberStatus &&
                    !isFull &&
                    group.status !== 'closed' &&
                    !group.is_locked && (
                        <Button
                            size="sm"
                            onClick={handleJoinClick}
                            disabled={group.is_locked}
                            className="h-8 md:h-9 px-3 md:px-4 rounded-lg border-0
                                bg-slate-900 hover:bg-slate-800
                                dark:bg-white dark:hover:bg-slate-100
                                text-white dark:text-slate-900
                                text-xs md:text-sm font-semibold"
                        >
                            Join Group
                        </Button>
                    )}

                {memberStatus && (
                    <Badge
                        className={`border-0 text-[10px] md:text-[11px] font-semibold flex items-center gap-1 ${role === 'leader'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                    >
                        {role === 'leader' && (
                            <Crown className="w-3 h-3" />
                        )}
                        {role === 'leader' ? 'Leader' : 'Member'}
                    </Badge>
                )}

                {isFull && !memberStatus && (
                    <Badge className="border-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] md:text-[11px] font-semibold">
                        Full
                    </Badge>
                )}

                {group.status === 'closed' && !memberStatus && (
                    <Badge className="border-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] md:text-[11px] font-semibold">
                        Closed
                    </Badge>
                )}

                {group.is_locked && !memberStatus && group.status !== 'closed' && (
                    <Badge className="border-0 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-[10px] md:text-[11px] font-semibold">
                        Locked
                    </Badge>
                )}
            </CardFooter>
        </Card>
    );
}