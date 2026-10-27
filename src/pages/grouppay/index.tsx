// src/pages/grouppay/index.tsx

import { useState, useRef, useCallback, useEffect } from 'react';
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
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { playSound } from '@/lib/soundManager';
import { useHomeRoute } from '@/hooks/useHomeRoute';

// ─────────────────────────────────────────────────────────────
// Hero slides
// ─────────────────────────────────────────────────────────────
const HERO_SLIDES = [
    {
        image:
            'https://plus.unsplash.com/premium_photo-1661767467261-4a4bed92a507?q=80&w=1600&auto=format&fit=crop',
        eyebrow: 'Study together',
        title: 'Split the cost.\nUnlock premium together.',
        subtitle:
            'Form a study group, collect contributions via M-Pesa, and unlock premium access for everyone — for a fraction of the solo price.',
    },
    {
        image:
            'https://images.unsplash.com/photo-1774599661166-ae302f07dd37?w=1600&auto=format&fit=crop&q=70',
        eyebrow: 'One payment',
        title: 'One payment.\nEveryone in.',
        subtitle:
            'Secure, one-time contributions. No subscriptions, no surprises — just collective access done right.',
    },
    {
        image:
            'https://plus.unsplash.com/premium_photo-1661274033354-1847f286e957?w=1600&auto=format&fit=crop&q=70',
        eyebrow: 'Cheaper per person',
        title: 'The more join,\nthe less you pay.',
        subtitle:
            'Transparent per-seat pricing that shrinks as your group grows. Premium has never been this affordable.',
    },
];

const AUTOPLAY_MS = 5200;

export default function GroupPayHome() {
    const navigate = useNavigate();
    const home = useHomeRoute();
    const { user } = useAuth();
    const {
        groups,
        loading,
        filters,
        joinGroup,
        updateFilters,
    } = useGroupPay();

    const contentRef = useRef<HTMLDivElement | null>(null);

    // ── Header glass intensity on scroll ─────────────────────
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const onScroll = () => setScrolled(el.scrollTop > 8);
        onScroll();
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    // ── Carousel state ───────────────────────────────────────
    const [slide, setSlide] = useState(0);
    const [paused, setPaused] = useState(false);
    const trackRef = useRef<HTMLDivElement | null>(null);

    const goToSlide = useCallback((i: number) => {
        const track = trackRef.current;
        if (!track) return;
        const idx = (i + HERO_SLIDES.length) % HERO_SLIDES.length;
        track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
        setSlide(idx);
    }, []);

    // Autoplay
    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => goToSlide(slide + 1), AUTOPLAY_MS);
        return () => clearInterval(t);
    }, [slide, paused, goToSlide]);

    // Sync index on manual swipe
    const onTrackScroll = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        if (idx !== slide) setSlide(idx);
    }, [slide]);

    // ── Back handler ─────────────────────────────────────────
    const handleBack = useCallback(() => {
        playSound('tap');
        if (navigator.vibrate) navigator.vibrate(20);
        navigate(home, { replace: true });
    }, [navigate, home]);

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
        playSound('tap');
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

    const userIsInAnyGroup = user
        ? groups.some((g: any) => isUserMember(g))
        : false;

    const showSkeleton = loading && groups.length === 0;

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
            {/* ── Floating glass header (no border, no shadow) ──── */}
            <header
                className={`
                    flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
                    z-30 safe-top transition-all duration-300
                    ${scrolled
                        ? 'bg-background/80 backdrop-blur-xl'
                        : 'bg-transparent'}
                `}
            >
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="flex items-center justify-center h-10 w-10 rounded-full
                        bg-white/70 dark:bg-white/10 backdrop-blur-md
                        hover:bg-white dark:hover:bg-white/20
                        active:scale-95 transition-all touch-manipulation"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-base sm:text-lg font-semibold tracking-tight
                    text-gray-900 dark:text-white truncate">
                    GroupPay
                </h1>
                <div className="ml-auto">
                    <button
                        onClick={handleCreateGroup}
                        aria-label="Create group"
                        className="flex items-center justify-center h-10 w-10 rounded-full
                            bg-gradient-to-br from-green-600 to-blue-600 text-white
                            active:scale-95 transition-all touch-manipulation"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ── Scrolling content ─────────────────────────────── */}
            <div
                ref={contentRef}
                className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
                    custom-scrollbar overscroll-contain
                    [-webkit-overflow-scrolling:touch]"
            >
                {showSkeleton ? (
                    <SkeletonLayout />
                ) : (
                    <div className="w-full md:max-w-6xl md:mx-auto md:px-4 md:pt-4 pb-24 safe-bottom">

                        {/* ═══════════════════════════════════════════ */}
                        {/* HERO CAROUSEL                              */}
                        {/* ═══════════════════════════════════════════ */}
                        <section
                            className="relative -mx-0 md:rounded-[28px] md:overflow-hidden"
                            onMouseEnter={() => setPaused(true)}
                            onMouseLeave={() => setPaused(false)}
                            onTouchStart={() => setPaused(true)}
                            onTouchEnd={() => setPaused(false)}
                        >
                            <div
                                ref={trackRef}
                                onScroll={onTrackScroll}
                                className="flex overflow-x-auto snap-x snap-mandatory
                                    scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]
                                    [&::-webkit-scrollbar]:hidden"
                            >
                                {HERO_SLIDES.map((s, i) => (
                                    <div
                                        key={i}
                                        className="relative min-w-full h-[68vh] md:h-[560px]
                                            snap-center snap-always shrink-0 overflow-hidden"
                                    >
                                        {/* Background image */}
                                        <div
                                            className="absolute inset-0 bg-cover bg-center scale-105
                                                transition-transform duration-[8000ms] ease-out"
                                            style={{ backgroundImage: `url(${s.image})` }}
                                        />
                                        {/* Gradient overlays for legibility */}
                                        <div className="absolute inset-0 bg-gradient-to-t
                                            from-black/85 via-black/40 to-black/20" />
                                        <div className="absolute inset-0 bg-gradient-to-br
                                            from-green-900/30 via-transparent to-blue-900/30 mix-blend-multiply" />

                                        {/* Slide content */}
                                        <div className="relative z-10 h-full flex flex-col justify-end
                                            px-6 pb-16 md:pb-20 pt-24 max-w-3xl">
                                            <span className="inline-flex items-center gap-1.5 self-start
                                                px-3 py-1.5 rounded-full mb-4
                                                bg-white/15 backdrop-blur-md
                                                text-[11px] md:text-xs font-semibold uppercase tracking-wider
                                                text-white/95">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                {s.eyebrow}
                                            </span>
                                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold
                                                leading-[1.03] tracking-tight text-white
                                                whitespace-pre-line">
                                                {s.title}
                                            </h1>
                                            <p className="mt-4 text-sm md:text-lg text-white/85
                                                max-w-xl leading-relaxed">
                                                {s.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Dots */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20
                                flex items-center gap-2">
                                {HERO_SLIDES.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goToSlide(i)}
                                        aria-label={`Slide ${i + 1}`}
                                        className={`transition-all duration-300 rounded-full
                                            ${i === slide
                                                ? 'w-7 h-2 bg-white'
                                                : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
                                    />
                                ))}
                            </div>

                            {/* Arrows (desktop) */}
                            <button
                                onClick={() => goToSlide(slide - 1)}
                                aria-label="Previous slide"
                                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20
                                    h-11 w-11 items-center justify-center rounded-full
                                    bg-white/15 hover:bg-white/30 backdrop-blur-md
                                    text-white transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => goToSlide(slide + 1)}
                                aria-label="Next slide"
                                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20
                                    h-11 w-11 items-center justify-center rounded-full
                                    bg-white/15 hover:bg-white/30 backdrop-blur-md
                                    text-white transition-all active:scale-95"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </section>

                        {/* ═══════════════════════════════════════════ */}
                        {/* FLOATING CTA DOCK (no border, no shadow)   */}
                        {/* ═══════════════════════════════════════════ */}
                        <section className="relative z-10 -mt-8 px-4 md:px-0">
                            <div className="mx-auto max-w-2xl rounded-2xl
                                bg-background/80 backdrop-blur-xl p-3">
                                <div className="flex flex-col sm:flex-row gap-2.5">
                                    <Button
                                        size="lg"
                                        onClick={handleCreateGroup}
                                        className="flex-1 gap-2 h-12 rounded-xl border-0
                                            bg-gradient-to-r from-green-600 to-blue-600
                                            hover:from-green-700 hover:to-blue-700
                                            text-white font-semibold text-[15px]
                                            active:scale-[0.98]
                                            transition-all duration-200"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Create Group
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={handleBrowseGroups}
                                        className="flex-1 gap-2 h-12 rounded-xl
                                            border-0
                                            bg-white/60 dark:bg-white/[0.04]
                                            hover:bg-white dark:hover:bg-white/10
                                            text-slate-900 dark:text-white font-medium
                                            active:scale-[0.98] transition-all duration-200"
                                    >
                                        <Users className="w-5 h-5" />
                                        Browse Groups
                                    </Button>
                                </div>
                            </div>
                        </section>

                        {/* ═══════════════════════════════════════════ */}
                        {/* SOLO NUDGE                                 */}
                        {/* ═══════════════════════════════════════════ */}
                        {!userIsInAnyGroup && (
                            <section className="px-4 md:px-0 pt-6 pb-4 md:pb-6 reveal">
                                <SoloSubscriptionCard role={user?.role ?? null} />
                            </section>
                        )}

                        {/* ═══════════════════════════════════════════ */}
                        {/* SEARCH                                     */}
                        {/* ═══════════════════════════════════════════ */}
                        <section
                            id="groups-section"
                            className="px-4 md:px-0 pt-6 pb-4 md:pb-6 reveal"
                        >
                            <div className="flex items-end justify-between mb-3 px-1">
                                <div>
                                    <h2 className="text-[22px] md:text-2xl font-bold tracking-tight
                                        text-slate-900 dark:text-white">
                                        Find a group
                                    </h2>
                                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                        Search by school, course, or group name
                                    </p>
                                </div>
                            </div>
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

                        {/* ═══════════════════════════════════════════ */}
                        {/* GROUPS GRID                                */}
                        {/* ═══════════════════════════════════════════ */}
                        <section className="px-4 md:px-0 pb-8 reveal">
                            {groups.length === 0 ? (
                                <EmptyState
                                    hasFilters={!!(filters.search || filters.school || filters.course)}
                                    onCreate={handleCreateGroup}
                                />
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-[22px] md:text-2xl font-bold tracking-tight
                                                text-slate-900 dark:text-white">
                                                Active Groups
                                            </h2>
                                            <Badge className="border-0 bg-slate-100 dark:bg-slate-800
                                                text-slate-600 dark:text-slate-300
                                                text-[11px] font-semibold rounded-full px-2.5">
                                                {groups.length}
                                            </Badge>
                                        </div>
                                        <button
                                            onClick={handleCreateGroup}
                                            className="text-xs md:text-sm font-semibold
                                                text-green-600 dark:text-green-400
                                                hover:text-green-700 dark:hover:text-green-300
                                                transition-colors flex items-center gap-1
                                                active:scale-95"
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
                )}
            </div>

            {/* Local styles for reveal + no-scrollbar */}
            <style>{`
                .reveal {
                    animation: revealUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                @keyframes revealUp {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .reveal { animation: none; }
                }
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .safe-top { padding-top: max(env(safe-area-inset-top), 0px); }
                .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 0px); }
            `}</style>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Empty state (no border, no shadow)
   ───────────────────────────────────────────────────────────── */
function EmptyState({
    hasFilters,
    onCreate,
}: {
    hasFilters: boolean;
    onCreate: () => void;
}) {
    return (
        <Card className="rounded-3xl bg-white dark:bg-muted/20 shadow-none border-0">
            <CardContent className="flex flex-col items-center justify-center py-16 md:py-20 px-6">
                <div className="w-16 h-16 rounded-2xl
                    bg-gradient-to-br from-green-100 to-blue-100
                    dark:from-green-950/40 dark:to-blue-950/40
                    flex items-center justify-center mb-5">
                    <Search className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold tracking-tight
                    text-slate-900 dark:text-white mb-2 text-center text-balance">
                    {hasFilters ? 'No groups match your filters' : 'Be the first to start a group'}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md leading-relaxed text-balance">
                    {hasFilters
                        ? 'Try adjusting your search or clear the filters to see every group.'
                        : 'Create a group with your classmates and split the cost of premium access. The more join, the cheaper it gets for everyone.'}
                </p>
                {!hasFilters && (
                    <Button
                        onClick={onCreate}
                        className="mt-6 gap-2 h-11 px-5 rounded-xl border-0
                            bg-gradient-to-r from-green-600 to-blue-600
                            hover:from-green-700 hover:to-blue-700
                            text-white font-semibold
                            active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Create the First Group
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/* ─────────────────────────────────────────────────────────────
   Skeleton — mirrors the new layout (no borders/shadows)
   ───────────────────────────────────────────────────────────── */
function SkeletonLayout() {
    return (
        <div className="w-full md:max-w-6xl md:mx-auto md:px-4 md:pt-4 pb-24 safe-bottom">
            {/* Carousel skeleton */}
            <Skeleton className="h-[68vh] md:h-[560px] md:rounded-[28px] border-0" />

            {/* CTA skeleton */}
            <div className="relative z-10 -mt-8 px-4 md:px-0">
                <div className="mx-auto max-w-2xl rounded-2xl p-3
                    bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <Skeleton className="flex-1 h-12 rounded-xl border-0" />
                        <Skeleton className="flex-1 h-12 rounded-xl border-0" />
                    </div>
                </div>
            </div>

            {/* Search skeleton */}
            <section className="px-4 md:px-0 pt-6 pb-4">
                <Skeleton className="h-6 w-40 mb-3 rounded-lg border-0" />
                <Skeleton className="h-12 w-full rounded-xl border-0" />
            </section>

            {/* Grid skeleton */}
            <section className="px-4 md:px-0 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card
                            key={i}
                            className="p-4 rounded-2xl bg-white dark:bg-muted/30 shadow-none border-0"
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
    );
}