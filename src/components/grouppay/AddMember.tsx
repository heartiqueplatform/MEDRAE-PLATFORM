// src/components/grouppay/AddMember.tsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { grouppayService } from '@/services/grouppayService';
import { CenteredModal } from '@/components/ui/CenteredModal';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { playSound } from '@/lib/soundManager';

/* ------------------------------------------------------------------ */
/*  Tap helper — matches sibling GroupPay files                        */
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
            <button
                type="button"
                onClick={() => {
                    tap();
                    setOpen(true);
                }}
                disabled={isFull}
                title={isFull ? 'Group is full' : 'Add a member'}
                className="h-10 px-4 rounded-xl
                           bg-violet-600 text-white
                           text-sm font-bold
                           flex items-center justify-center gap-1.5
                           active:scale-[0.97] transition-transform
                           disabled:opacity-50 disabled:cursor-not-allowed
                           disabled:active:scale-100"
                style={{ touchAction: 'manipulation' }}
            >
                <UserPlus className="h-4 w-4" />
                {triggerLabel}
            </button>

            {/* DIALOG */}
            <CenteredModal
                open={open}
                onClose={() => setOpen(false)}
                title="Add members"
                maxWidthClass="max-w-lg"
                maxHeight="90vh"
            >
                <div className="px-4 pb-4 space-y-3">
                    {/* SUBTITLE */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug -mt-1">
                        Invite classmates to join your study group.
                    </p>

                    {/* CAPACITY BANNER */}
                    <div
                        className={`flex items-center justify-between gap-2 rounded-xl p-3 ${isFull
                            ? 'bg-amber-50 dark:bg-amber-400/10'
                            : 'bg-violet-50 dark:bg-violet-400/10'
                            }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Users
                                className={`h-4 w-4 shrink-0 ${isFull
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-violet-600 dark:text-violet-400'
                                    }`}
                            />
                            <span
                                className={`text-[11px] font-bold ${isFull
                                    ? 'text-amber-700 dark:text-amber-300'
                                    : 'text-violet-700 dark:text-violet-300'
                                    }`}
                            >
                                {localCount} / {maxMembers} members
                            </span>
                        </div>
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5
                                        text-[10px] font-bold shrink-0 ${isFull
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400'
                                    : 'bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-400'
                                }`}
                        >
                            {isFull
                                ? 'Full'
                                : `${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} left`}
                        </span>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4
                                           text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <Input
                            type="text"
                            placeholder="Search by name, email, or phone…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9 h-10 rounded-xl border-0 text-sm
                                       bg-slate-50 dark:bg-[#0d1117]
                                       focus-visible:ring-2 focus-visible:ring-violet-500/40"
                            autoFocus
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4
                                                text-slate-400 dark:text-slate-500 animate-spin" />
                        )}
                    </div>

                    {/* RESULTS LIST */}
                    <div className="space-y-1.5">
                        {searching && visibleResults.length === 0 && (
                            <div className="py-10 text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-2" />
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Searching…
                                </p>
                            </div>
                        )}

                        {!searching && visibleResults.length === 0 && emptyMessage && (
                            <div className="py-10 text-center">
                                <div className="h-12 w-12 rounded-full
                                                bg-slate-100 dark:bg-white/[0.06]
                                                flex items-center justify-center mx-auto mb-3">
                                    <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {emptyMessage}
                                </p>
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
                                            className={`flex items-center gap-3 p-2.5 rounded-xl ${isJustAdded
                                                ? 'bg-emerald-50 dark:bg-emerald-400/10'
                                                : 'bg-slate-50 dark:bg-[#0d1117]'
                                                }`}
                                        >
                                            {/* AVATAR */}
                                            <Avatar className="h-9 w-9 shrink-0">
                                                <AvatarImage src={user.avatar_url} />
                                                <AvatarFallback className="text-[11px] font-bold
                                                                           bg-slate-200 dark:bg-white/[0.1]
                                                                           text-slate-600 dark:text-slate-300">
                                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* INFO */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-[12px] font-bold truncate
                                                                  text-slate-900 dark:text-white">
                                                        {user.name || 'Unknown'}
                                                    </p>
                                                    {user.role && (
                                                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5
                                                                         text-[9px] font-bold capitalize
                                                                         bg-slate-100 text-slate-600
                                                                         dark:bg-white/[0.06] dark:text-slate-300">
                                                            {user.role}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Contact line */}
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                    {user.email || user.phone || 'No contact info'}
                                                </p>

                                                {/* Institution / County / Course line — only if any exists */}
                                                {(user.institution || user.county || user.course) && (
                                                    <div className="flex items-center gap-2 mt-0.5
                                                                    text-[10px] text-slate-400 dark:text-slate-500 flex-wrap">
                                                        {user.institution && (
                                                            <span className="flex items-center gap-0.5 truncate">
                                                                <GraduationCap className="h-2.5 w-2.5 shrink-0" />
                                                                <span className="truncate">{user.institution}</span>
                                                            </span>
                                                        )}
                                                        {user.county && (
                                                            <span className="flex items-center gap-0.5 shrink-0">
                                                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                                                {user.county}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ACTION BUTTON */}
                                            {isJustAdded ? (
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                                                 text-[10px] font-bold shrink-0
                                                                 bg-emerald-50 text-emerald-700
                                                                 dark:bg-emerald-400/10 dark:text-emerald-400">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Added
                                                </span>
                                            ) : isAlreadyInGroup ? (
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5
                                                                 text-[10px] font-bold shrink-0
                                                                 bg-slate-100 text-slate-600
                                                                 dark:bg-white/[0.06] dark:text-slate-300">
                                                    In group
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        tap();
                                                        handleAdd(user);
                                                    }}
                                                    disabled={isDisabled}
                                                    className="h-8 px-3 rounded-full shrink-0
                                                               bg-violet-600 text-white text-[11px] font-bold
                                                               flex items-center gap-1
                                                               active:scale-[0.95] transition-transform
                                                               disabled:opacity-50 disabled:cursor-not-allowed
                                                               disabled:active:scale-100"
                                                    style={{ touchAction: 'manipulation' }}
                                                >
                                                    {isAdding ? (
                                                        <>
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Adding…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus className="h-3 w-3" />
                                                            Add
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* FOOTER HINT */}
                        {visibleResults.length > 0 && !searching && (
                            <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl
                                            bg-blue-50 dark:bg-blue-400/10">
                                <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                    Only users who aren't already covered by a subscription are
                                    shown here. Add a member to give them access through this group.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </CenteredModal>
        </>
    );
}