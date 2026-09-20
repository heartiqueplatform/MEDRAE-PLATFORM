// src/pages/grouppay/index.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useGroupPay } from '@/hooks/useGroupPay';
import { GroupCard } from '@/components/grouppay/GroupCard';
import { SearchFilters } from '@/components/grouppay/SearchFilters';
import { SoloSubscriptionCard } from '@/components/grouppay/SoloSubscriptionCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Plus,
    Search,
    Sparkles,
    Wallet,
    Rocket,
    ShieldCheck,
    TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function GroupPayHome() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        groups,
        loading,
        filters,
        joinGroup,
        updateFilters,
    } = useGroupPay();

    const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

    const handleJoinGroup = async (groupId: string) => {
        if (!user) {
            toast.error('Please log in to join a group');
            return;
        }
        setJoiningGroupId(groupId);
        await joinGroup(groupId);
        setJoiningGroupId(null);
    };

    const handleCreateGroup = () => {
        navigate('/grouppay/create');
    };

    const handleBrowseGroups = () => {
        document.getElementById('groups-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const isUserMember = (group: any) => {
        if (!user) return false;
        return group.members?.some((m: any) => m.user_id === user.id) || false;
    };

    const getUserRole = (group: any) => {
        if (!user) return null;
        const member = group.members?.find((m: any) => m.user_id === user.id);
        return member?.role || null;
    };

    // ============================================================
    // Is the current user already inside any group?
    // Used to decide whether to show the "go solo" nudge.
    // ============================================================
    const userIsInAnyGroup = user
        ? groups.some((g: any) => isUserMember(g))
        : false;

    // ============================================================
    // LOADING SKELETON — edge-to-edge on mobile, no borders
    // ============================================================
    if (loading && groups.length === 0) {
        return (
            <div className="min-h-screen w-full bg-slate-50/50 dark:bg-background pb-16 md:pb-10">
                <div className="w-full md:max-w-6xl md:mx-auto md:px-4 md:pt-6">

                    {/* Hero skeleton */}
                    <section className="text-center space-y-4 px-4 pt-10 md:pt-14 pb-6 md:pb-10">
                        <Skeleton className="h-8 md:h-10 w-40 mx-auto rounded-full border-0" />
                        <Skeleton className="h-10 md:h-14 w-3/4 mx-auto rounded-xl border-0" />
                        <Skeleton className="h-5 md:h-6 w-full max-w-xl mx-auto rounded-xl border-0" />
                        <div className="flex gap-3 justify-center pt-3">
                            <Skeleton className="h-12 w-40 rounded-xl border-0" />
                            <Skeleton className="h-12 w-40 rounded-xl border-0" />
                        </div>
                    </section>

                    {/* Group grid skeleton */}
                    <section className="px-4 md:px-0 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card
                                    key={i}
                                    className="p-4 rounded-2xl border-0 bg-white dark:bg-muted/30 shadow-none"
                                >
                                    <Skeleton className="h-6 w-3/4 mb-3 rounded-lg border-0" />
                                    <Skeleton className="h-4 w-1/2 mb-5 rounded-lg border-0" />
                                    <Skeleton className="h-4 w-full mb-2 rounded-lg border-0" />
                                    <Skeleton className="h-4 w-2/3 rounded-lg border-0" />
                                </Card>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-slate-50/50 dark:bg-background pb-16 md:pb-10">
            <div className="w-full md:max-w-6xl md:mx-auto md:px-4 md:pt-6">

                {/* ============================================ */}
                {/* HERO SECTION — edge-to-edge on mobile, borderless */}
                {/* ============================================ */}
                <section className="relative text-center space-y-6 px-4 pt-10 md:pt-16 pb-8 md:pb-14">

                    {/* Soft gradient wash */}
                    <div className="pointer-events-none absolute inset-0 -z-0
                        bg-gradient-to-br from-green-50/60 via-transparent to-blue-50/60
                        dark:from-green-950/10 dark:via-transparent dark:to-blue-950/10" />

                    <div className="relative z-10 space-y-6 max-w-3xl mx-auto">

                        {/* Headline */}
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight
                            bg-gradient-to-r from-green-600 via-emerald-600 to-blue-600
                            bg-clip-text text-transparent">
                            Split the cost.
                            <br className="hidden md:block" />
                            Unlock premium together.
                        </h1>

                        {/* Subheadline */}
                        <p className="text-sm md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                            Form a study group, collect contributions via M-Pesa,
                            and unlock premium access for everyone — for a fraction of the solo price.
                        </p>

                        {/* CTA buttons */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center pt-2">
                            <Button
                                size="lg"
                                onClick={handleCreateGroup}
                                className="gap-2 h-12 md:h-11 px-6 rounded-xl border-0
                                    bg-gradient-to-r from-green-600 to-blue-600
                                    hover:from-green-700 hover:to-blue-700
                                    text-white font-bold
                                    shadow-lg shadow-green-600/20
                                    hover:shadow-xl hover:shadow-green-600/30
                                    transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                Create Group
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={handleBrowseGroups}
                                className="gap-2 h-12 md:h-11 px-6 rounded-xl border-0
                                    bg-white dark:bg-slate-800
                                    hover:bg-slate-50 dark:hover:bg-slate-700
                                    text-slate-900 dark:text-white font-medium"
                            >
                                <Users className="w-5 h-5" />
                                Browse Groups
                            </Button>
                        </div>

                        {/* Trust row */}
                        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3
                            text-[11px] md:text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <TrendingDown className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span>Cheaper per person</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span>One-time payment</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                <span>M-Pesa powered</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============================================ */}
                {/* SOLO SUBSCRIPTION NUDGE                     */}
                {/* Shown only when the user isn't in any group */}
                {/* ============================================ */}
                {!userIsInAnyGroup && (
                    <section className="px-4 md:px-0 pb-4 md:pb-6">
                        <SoloSubscriptionCard
                            role={user?.role ?? null}
                        // Optional: pass a formatted price string if you have one
                        // e.g. priceLabel="KSh 399 / 2 months"
                        />
                    </section>
                )}

                {/* ============================================ */}
                {/* SEARCH SECTION — edge-to-edge on mobile */}
                {/* ============================================ */}
                <section id="groups-section" className="px-4 md:px-0 pb-4 md:pb-6">
                    <SearchFilters
                        search={filters.search}
                        school={filters.school}
                        course={filters.course}
                        sort={filters.sort}
                        onSearchChange={(value) => updateFilters({ search: value })}
                        onSchoolChange={(value) => updateFilters({ school: value })}
                        onCourseChange={(value) => updateFilters({ course: value })}
                        onSortChange={(value) => updateFilters({ sort: value })}
                    />
                </section>

                {/* ============================================ */}
                {/* GROUPS GRID — edge-to-edge on mobile */}
                {/* ============================================ */}
                <section className="px-4 md:px-0 pb-8">
                    {groups.length === 0 ? (
                        <Card className="border-0 rounded-2xl bg-white dark:bg-muted/30 shadow-none">
                            <CardContent className="flex flex-col items-center justify-center py-16 md:py-20 px-6">
                                <div className="w-16 h-16 rounded-full
                                    bg-gradient-to-br from-green-100 to-blue-100
                                    dark:from-green-950/40 dark:to-blue-950/40
                                    flex items-center justify-center mb-5 border-0">
                                    <Search className="w-7 h-7 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">
                                    {filters.search || filters.school || filters.course
                                        ? "No groups match your filters"
                                        : "Be the first to start a group"}
                                </h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                                    {filters.search || filters.school || filters.course
                                        ? "Try adjusting your search or clear the filters to see every group."
                                        : "Create a group with your classmates and split the cost of premium access. The more join, the cheaper it gets for everyone."}
                                </p>
                                {!filters.search && !filters.school && !filters.course && (
                                    <Button
                                        onClick={handleCreateGroup}
                                        className="mt-6 gap-2 h-11 px-5 rounded-xl border-0
                                            bg-gradient-to-r from-green-600 to-blue-600
                                            hover:from-green-700 hover:to-blue-700
                                            text-white font-bold"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create the First Group
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Section header */}
                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                                        Active Groups
                                    </h2>
                                    <Badge className="border-0 bg-slate-100 dark:bg-slate-800
                                        text-slate-600 dark:text-slate-400
                                        text-[10px] font-bold">
                                        {groups.length}
                                    </Badge>
                                </div>
                                <button
                                    onClick={handleCreateGroup}
                                    className="text-xs md:text-sm font-bold
                                        text-green-600 dark:text-green-400
                                        hover:text-green-700 dark:hover:text-green-300
                                        transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    New Group
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {groups.map((group) => (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        onJoin={handleJoinGroup}
                                        isMember={isUserMember(group)}
                                        userRole={getUserRole(group)}
                                        currentUserId={user?.id}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}