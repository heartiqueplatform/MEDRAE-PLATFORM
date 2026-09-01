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

    // Check if user is member of a group
    const isUserMember = (group: any) => {
        if (!user) return false;
        return group.members?.some((m: any) => m.user_id === user.id) || false;
    };

    // Get user's role in a group
    const getUserRole = (group: any) => {
        if (!user) return null;
        const member = group.members?.find((m: any) => m.user_id === user.id);
        return member?.role || null;
    };

    // Loading skeletons
    if (loading && groups.length === 0) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="space-y-8">
                    <div className="text-center space-y-4">
                        <Skeleton className="h-12 w-3/4 mx-auto" />
                        <Skeleton className="h-6 w-1/2 mx-auto" />
                        <div className="flex gap-4 justify-center">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="p-4">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2 mb-4" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-2/3" />
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Hero Section */}
            <section className="text-center space-y-6 py-8 md:py-12">
                <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    Study Together. Pay Together. Learn Together.
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                    Join or create study groups with classmates or friends. Contribute together,
                    then activate premium access for everyone with a single group payment.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                    <Button size="lg" onClick={handleCreateGroup} className="gap-2">
                        <Plus className="w-5 h-5" />
                        Create Group
                    </Button>
                    <Button size="lg" variant="outline" onClick={handleBrowseGroups} className="gap-2">
                        <Users className="w-5 h-5" />
                        Browse Groups
                    </Button>
                </div>
            </section>

            {/* Search Section */}
            <section id="groups-section" className="space-y-6 py-8">
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

            {/* Groups Grid */}
            <section className="py-8">
                {groups.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Search className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-xl font-semibold mb-2">No Groups Found</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                {filters.search || filters.school || filters.course
                                    ? "We couldn't find any groups matching your filters. Try adjusting your search criteria."
                                    : "There are no study groups available yet. Be the first to create one!"}
                            </p>
                            {!filters.search && !filters.school && !filters.course && (
                                <Button onClick={handleCreateGroup} className="mt-4 gap-2">
                                    <Plus className="w-4 h-4" />
                                    Create First Group
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    );
}