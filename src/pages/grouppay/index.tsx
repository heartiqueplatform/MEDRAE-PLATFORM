// src/pages/grouppay/index.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useGroupPay } from '@/hooks/useGroupPay';
import { GroupCard } from '@/components/grouppay/GroupCard';
import { SearchFilters } from '@/components/grouppay/SearchFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, AlertCircle, Search } from 'lucide-react';
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
    // LOADING SKELETON — edge-to-edge on mobile, no borders
    // ============================================================
    if (loading && groups.length === 0) {
        return (
            <div className="min-h-screen w-full bg-slate-50/50 dark:bg-background pb-16 md:pb-10">
                <div className="w-full md:max-w-6xl md:mx-auto md:px-4 md:pt-6">

                    {/* Hero skeleton */}
                    <section className="text-center space-y-4 px-4 pt-8 md:pt-12 pb-6 md:pb-8">
                        <Skeleton className="h-10 md:h-12 w-3/4 mx-auto rounded-xl border-0" />
                        <Skeleton className="h-5 md:h-6 w-full max-w-xl mx-auto rounded-xl border-0" />
                        <div className="flex gap-3 justify-center pt-2">
                            <Skeleton className="h-11 w-36 rounded-xl border-0" />
                            <Skeleton className="h-11 w-36 rounded-xl border-0" />
                        </div>
                    </section>

                    {/* Group grid skeleton */}
                    <section className="px-4 md:px-0 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card
                                    key={i}
                                    className="p-4 rounded-xl border-0 bg-white dark:bg-muted/30 shadow-none"
                                >
                                    <Skeleton className="h-6 w-3/4 mb-2 rounded-lg border-0" />
                                    <Skeleton className="h-4 w-1/2 mb-4 rounded-lg border-0" />
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
                {/* HERO SECTION — edge-to-edge on mobile */}
                {/* ============================================ */}
                <section className="relative text-center space-y-5 md:space-y-6 px-4 pt-8 md:pt-12 pb-8 md:pb-12">

                    {/* Soft gradient wash */}
                    <div className="pointer-events-none absolute inset-0 -z-0
                        bg-gradient-to-br from-green-50/40 via-transparent to-blue-50/40
                        dark:from-green-950/10 dark:via-transparent dark:to-blue-950/10" />

                    <div className="relative z-10 space-y-5 md:space-y-6">
                        <h1 className="text-2xl md:text-5xl font-bold leading-tight tracking-tight
                            bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                            Study Together. Pay Together. Learn Together.
                        </h1>

                        <p className="text-sm md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Join or create study groups with classmates or friends. Contribute together,
                            then activate premium access for everyone with a single group payment.
                        </p>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center pt-2">
                            <Button
                                size="lg"
                                onClick={handleCreateGroup}
                                className="gap-2 h-12 md:h-11 px-6 rounded-xl border-0
                                    bg-gradient-to-r from-green-600 to-blue-600
                                    hover:from-green-700 hover:to-blue-700
                                    text-white font-bold"
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
                    </div>
                </section>

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
                            <CardContent className="flex flex-col items-center justify-center py-14 md:py-16 px-6">
                                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                    <Search className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                                </div>
                                <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                    {filters.search || filters.school || filters.course
                                        ? "No groups match your filters"
                                        : "No study groups yet"}
                                </h3>
                                <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed">
                                    {filters.search || filters.school || filters.course
                                        ? "Try adjusting your search criteria or clear the filters to see all groups."
                                        : "Be the first to create a study group and start saving on premium access with your classmates."}
                                </p>
                                {!filters.search && !filters.school && !filters.course && (
                                    <Button
                                        onClick={handleCreateGroup}
                                        className="mt-5 gap-2 h-11 px-5 rounded-xl border-0
                                            bg-gradient-to-r from-green-600 to-blue-600
                                            hover:from-green-700 hover:to-blue-700
                                            text-white font-bold"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create First Group
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
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
                    )}
                </section>
            </div>
        </div>
    );
}