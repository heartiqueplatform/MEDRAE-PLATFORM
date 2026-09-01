// src/components/grouppay/GroupCard.tsx - Updated with optional contact indicator

import { StudyGroup } from '@/types/grouppay';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, User, Lock, Unlock, Calendar, Crown, Phone } from 'lucide-react';
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
    currentUserId
}: GroupCardProps) {
    const navigate = useNavigate();
    const progress = (group.current_members / group.max_members) * 100;
    const isFull = group.current_members >= group.max_members;

    const isCreator = currentUserId === group.created_by;
    const memberStatus = isMember !== undefined ? isMember :
        group.members?.some(m => m.user_id === currentUserId) || false;
    const role = userRole || group.members?.find(m => m.user_id === currentUserId)?.role || null;

    // ✅ Check if leader has contact info
    const hasContactInfo = !!(group.leader_phone || group.leader_whatsapp || group.leader_email);

    const handleCardClick = () => {
        navigate(`/grouppay/${group.id}`);
    };

    const handleJoinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onJoin) {
            onJoin(group.id);
        }
    };

    const statusColors = {
        open: 'bg-green-500',
        payment_pending: 'bg-yellow-500',
        active: 'bg-blue-500',
        closed: 'bg-gray-500',
    };

    return (
        <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={handleCardClick}
        >
            <CardHeader className="space-y-2">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold line-clamp-1">{group.group_name}</h3>
                        <p className="text-sm text-muted-foreground">{group.school}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge
                            variant={group.is_locked ? "destructive" : "default"}
                            className="ml-2 shrink-0"
                        >
                            {group.is_locked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                            {group.is_locked ? 'Locked' : 'Open'}
                        </Badge>
                        <Badge className={`${statusColors[group.status]} text-white`}>
                            {group.status.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                    <User className="w-4 h-4 mr-1" />
                    <span>Created by {group.creator?.name || 'Unknown'}</span>
                    {isCreator && (
                        <Crown className="w-4 h-4 ml-2 text-yellow-500" />
                    )}
                    {/* ✅ Optional: Show contact indicator */}
                    {hasContactInfo && (
                        <Phone className="w-3 h-3 ml-2 text-green-500" />
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                            {group.current_members} / {group.max_members} Members
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
                    </span>
                </div>

                <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                        {Math.round(progress)}% full
                    </p>
                </div>

                {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {group.description}
                    </p>
                )}

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Contribution:</span>
                    <span className="font-medium">KSh {group.contribution_per_member}</span>
                </div>
            </CardContent>

            <CardFooter className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                    Code: <span className="font-mono font-medium">{group.group_code}</span>
                </div>
                {!memberStatus && !isFull && group.status !== 'closed' && (
                    <Button
                        size="sm"
                        onClick={handleJoinClick}
                        disabled={group.is_locked}
                    >
                        Join Group
                    </Button>
                )}
                {memberStatus && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        {role === 'leader' && <Crown className="w-3 h-3 text-yellow-500" />}
                        {role === 'leader' ? 'Leader' : 'Member'}
                    </Badge>
                )}
                {isFull && !memberStatus && (
                    <Badge variant="secondary">Full</Badge>
                )}
                {group.status === 'closed' && !memberStatus && (
                    <Badge variant="secondary">Closed</Badge>
                )}
            </CardFooter>
        </Card>
    );
}