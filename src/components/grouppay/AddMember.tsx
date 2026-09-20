// src/components/grouppay/AddMember.tsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { grouppayService } from '@/services/grouppayService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Search,
    UserPlus,
    CheckCircle,
    Loader2,
    Users,
    Info,
    MapPin,
    GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

interface AddMemberProps {
    /** Group id to add members to */
    groupId: string;
    /** Current member user_ids — excluded from search results */
    existingMemberIds: string[];
    /** Current count of members in the group */
    currentMemberCount: number;
    /** Maximum allowed members */
    maxMembers: number;
    /** Called after a member is successfully added */
    onMemberAdded?: (userId: string, userName: string) => void | Promise<void>;
    /** Optional custom trigger button text */
    triggerLabel?: string;
}

interface SearchedUser {
    user_id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    avatar_url?: string;
    institution?: string;
    county?: string;
    course?: string;
    has_active_subscription?: boolean;
}

export function AddMember({
    groupId,
    existingMemberIds,
    currentMemberCount,
    maxMembers,
    onMemberAdded,
    triggerLabel = 'Add Member',
}: AddMemberProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchedUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());

    // Local mirrors so we get instant feedback without waiting for parent refresh
    const [localMemberIds, setLocalMemberIds] = useState<Set<string>>(
        new Set(existingMemberIds)
    );
    const [localCount, setLocalCount] = useState(currentMemberCount);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync incoming prop changes (after parent refresh)
    useEffect(() => {
        setLocalMemberIds(new Set(existingMemberIds));
        setLocalCount(currentMemberCount);
    }, [existingMemberIds, currentMemberCount]);

    const isFull = localCount >= maxMembers;
    const remainingSlots = Math.max(0, maxMembers - localCount);

    // ============================================================
    // DEBOUNCED SEARCH — 300ms
    // ============================================================
    useEffect(() => {
        if (!open) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                setSearching(true);
                const exclude = Array.from(localMemberIds);
                const data = await grouppayService.searchUsers(query, exclude, 40);
                setResults(data as SearchedUser[]);
            } catch (err: any) {
                console.error('Search failed:', err);
                // Silent — user doesn't need a toast for search errors
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, open, localMemberIds]);

    // Reset transient state when the dialog closes
    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults([]);
            setJustAddedIds(new Set());
            setAddingId(null);
        }
    }, [open]);

    // ============================================================
    // PRIVACY FILTER — hide premium users entirely
    // ============================================================
    // We never render users with an active subscription so nobody can
    // infer who pays, how much, or what the platform earns.
    const visibleResults = useMemo(
        () => results.filter((u) => u.has_active_subscription !== true),
        [results]
    );

    // ============================================================
    // ADD MEMBER HANDLER
    // ============================================================
    const handleAdd = useCallback(
        async (user: SearchedUser) => {
            if (isFull) {
                toast.error('Group is full');
                return;
            }
            if (localMemberIds.has(user.user_id)) {
                toast.error(`${user.name} is already in this group`);
                return;
            }

            setAddingId(user.user_id);
            try {
                await grouppayService.addMemberToGroup(groupId, user.user_id, 'member');

                // Optimistic local update
                setLocalMemberIds((prev) => {
                    const next = new Set(prev);
                    next.add(user.user_id);
                    return next;
                });
                setLocalCount((prev) => prev + 1);
                setJustAddedIds((prev) => {
                    const next = new Set(prev);
                    next.add(user.user_id);
                    return next;
                });

                toast.success(`${user.name} added to the group!`);

                // Notify parent so it can refresh its own view
                try {
                    await onMemberAdded?.(user.user_id, user.name);
                } catch (err) {
                    console.error('onMemberAdded callback failed:', err);
                }

                // Remove from results after a short "Added" flash
                setTimeout(() => {
                    setResults((prev) => prev.filter((u) => u.user_id !== user.user_id));
                }, 1200);
            } catch (err: any) {
                console.error('Add member failed:', err);
                toast.error(err?.message || 'Failed to add member');
            } finally {
                setAddingId(null);
            }
        },
        [groupId, isFull, localMemberIds, onMemberAdded]
    );

    // ============================================================
    // EMPTY / EDGE STATES
    // ============================================================
    const emptyMessage = useMemo(() => {
        if (searching) return null;
        if (isFull) return 'Group is full — no more members can be added.';
        if (query.trim()) return `No users found matching "${query}"`;
        return 'No users available to add right now.';
    }, [searching, query, isFull]);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <>
            {/* TRIGGER BUTTON */}
            <Button
                type="button"
                onClick={() => setOpen(true)}
                disabled={isFull}
                className="gap-2 text-sm border-0 h-11 rounded-xl
                    bg-indigo-100 text-indigo-700
                    dark:bg-muted/100 dark:text-indigo-400
                    hover:bg-indigo-200 dark:hover:bg-indigo-900/40
                    font-normal disabled:opacity-50 disabled:cursor-not-allowed"
                title={isFull ? 'Group is full' : 'Add a member'}
            >
                <UserPlus className="w-4 h-4" />
                {triggerLabel}
            </Button>

            {/* DIALOG */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="sm:max-w-lg border-0 rounded-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden custom-scrollbar
                        bg-white dark:bg-[#0d1117]"
                    overlayClassName="bg-white/80 dark:bg-[#0d1117]/80"
                >
                    <DialogHeader className="px-5 pt-5 pb-3 border-0">
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Add Members
                        </DialogTitle>
                        <DialogDescription>
                            Invite classmates to join your study group
                        </DialogDescription>
                    </DialogHeader>

                    {/* CAPACITY BANNER */}
                    <div className="px-5 pb-3">
                        <div
                            className={`flex items-center justify-between gap-2 p-3 rounded-xl border-0 ${isFull
                                ? 'bg-amber-50 dark:bg-amber-950/20'
                                : 'bg-indigo-50 dark:bg-indigo-950/20'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users
                                    className={`w-4 h-4 flex-shrink-0 ${isFull
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-indigo-600 dark:text-indigo-400'
                                        }`}
                                />
                                <span
                                    className={`text-xs font-medium ${isFull
                                        ? 'text-amber-700 dark:text-amber-400'
                                        : 'text-indigo-700 dark:text-indigo-400'
                                        }`}
                                >
                                    Group: {localCount} / {maxMembers} members
                                </span>
                            </div>
                            {!isFull ? (
                                <Badge className="border-0 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">
                                    {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} left
                                </Badge>
                            ) : (
                                <Badge className="border-0 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                    Full
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="px-5 pb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="pl-9 h-11 rounded-xl border-0 bg-slate-50 dark:bg-slate-900/50 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                                autoFocus
                            />
                            {searching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                            )}
                        </div>
                    </div>

                    {/* RESULTS LIST — scrollable */}
                    <div className="overflow-y-auto flex-1 px-5 pb-5 custom-scrollbar">
                        {searching && visibleResults.length === 0 && (
                            <div className="py-10 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">Searching...</p>
                            </div>
                        )}

                        {!searching && visibleResults.length === 0 && emptyMessage && (
                            <div className="py-10 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                    <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                            </div>
                        )}

                        {visibleResults.length > 0 && (
                            <div className="space-y-1.5">
                                {visibleResults.map((user) => {
                                    const isAdding = addingId === user.user_id;
                                    const isJustAdded = justAddedIds.has(user.user_id);
                                    const isAlreadyInGroup = localMemberIds.has(user.user_id);
                                    const isDisabled =
                                        isFull || isAdding || isJustAdded || isAlreadyInGroup;

                                    return (
                                        <div
                                            key={user.user_id}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl border-0 transition-colors ${isJustAdded
                                                ? 'bg-emerald-50 dark:bg-emerald-950/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                                                }`}
                                        >
                                            {/* AVATAR */}
                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                <AvatarImage src={user.avatar_url} />
                                                <AvatarFallback className="text-sm bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-semibold">
                                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* INFO */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                                                        {user.name || 'Unknown'}
                                                    </p>
                                                    {user.role && (
                                                        <Badge className="border-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-medium capitalize">
                                                            {user.role}
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Contact line */}
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {user.email || user.phone || 'No contact info'}
                                                </p>

                                                {/* Institution / County / Course line — only if any exists */}
                                                {(user.institution || user.county || user.course) && (
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/80 flex-wrap">
                                                        {user.institution && (
                                                            <span className="flex items-center gap-0.5 truncate">
                                                                <GraduationCap className="w-2.5 h-2.5 flex-shrink-0" />
                                                                <span className="truncate">{user.institution}</span>
                                                            </span>
                                                        )}
                                                        {user.county && (
                                                            <span className="flex items-center gap-0.5 flex-shrink-0">
                                                                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                                                {user.county}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACTION BUTTON */}
                                            {isJustAdded ? (
                                                <Badge className="border-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Added
                                                </Badge>
                                            ) : isAlreadyInGroup ? (
                                                <Badge className="border-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium flex-shrink-0">
                                                    In Group
                                                </Badge>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    onClick={() => handleAdd(user)}
                                                    disabled={isDisabled}
                                                    size="sm"
                                                    className="gap-1.5 text-xs border-0 rounded-lg h-8 px-3 flex-shrink-0
                                                        bg-indigo-600 hover:bg-indigo-700
                                                        text-white font-semibold
                                                        disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isAdding ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Adding...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-3 h-3" />
                                                            Add
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* FOOTER HINT */}
                        {visibleResults.length > 0 && !searching && (
                            <div className="mt-4 flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-xl border-0">
                                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed">
                                    Only users who are not already covered by a subscription are
                                    shown here. Add a member to give them access through this group.
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}