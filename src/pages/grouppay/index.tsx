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

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */

const vibrate = (pattern: number | number[] = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

const tap = (type: 'light' | 'success' = 'light') => {
    playSound('ui-tap');
    if (type === 'success') vibrate([15, 30, 15]);
    else vibrate(15);
};

/* ------------------------------------------------------------------ */
/*  Hero slides                                                       */
/* ------------------------------------------------------------------ */

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
    const { groups, loading, filters, joinGroup, updateFilters } = useGroupPay();

    const contentRef = useRef<HTMLDivElement | null>(null);

    /* Header glass on scroll */
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;
        const onScroll = () => setScrolled(el.scrollTop > 8);
        onScroll();
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    /* Carousel state */
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

    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => goToSlide(slide + 1), AUTOPLAY_MS);
        return () => clearInterval(t);
    }, [slide, paused, goToSlide]);

    const onTrackScroll = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        if (idx !== slide) setSlide(idx);
    }, [slide]);

    /* Back */
    const handleBack = useCallback(() => {
        tap();
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
        tap('success');
        navigate('/grouppay/create');
    };

    const handleBrowseGroups = () => {
        tap();
        document
            .getElementById('groups-section')
            ?.scrollIntoView({ behavior: 'smooth' });
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
        <div className="h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-[#0d1117] overflow-hidden">
            {/* ── Header (no gradient, no Create button) ───────── */}
            <header
                className={`
                    flex-shrink-0 w-full flex items-center gap-2 px-2 h-14
                    z-30 safe-top transition-colors duration-200
                    border-b border-slate-200/70 dark:border-white/[0.06]
                    ${scrolled
                        ? 'bg-white/90 dark:bg-[#0d1117]/90 backdrop-blur-xl'
                        : 'bg-white dark:bg-[#0d1117]'
                    }
                `}
            >
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="flex items-center justify-center h-10 w-10 rounded-full
                               text-slate-700 dark:text-slate-200
                               active:bg-slate-100 dark:active:bg-white/5
                               transition-colors"
                    style={{ touchAction: 'manipulation' }}
                >
                    <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold leading-tight truncate
                                   text-slate-900 dark:text-white">
                        GroupPay
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        Study together, pay less
                    </p>
                </div>
            </header>

            {/* ── Scrolling content ─────────────────────────────── */}
            <div
                ref={contentRef}
                className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
                           no-scrollbar overscroll-contain
                           [-webkit-overflow-scrolling:touch]"
            >
                {showSkeleton ? (
                    <SkeletonLayout />
                ) : (
                    <div className="w-full md:max-w-6xl md:mx-auto md:px-4 md:pt-4 pb-32 safe-bottom">
                        {/* ── HERO CAROUSEL ──────────────────────── */}
                        <section
                            className="relative -mx-0 md:rounded-2xl md:overflow-hidden"
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
                                        className="relative min-w-full h-[58vh] md:h-[440px]
                                                   snap-center snap-always shrink-0 overflow-hidden"
                                    >
                                        <div
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{ backgroundImage: `url(${s.image})` }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t
                                                        from-black/85 via-black/40 to-black/20" />

                                        <div className="relative z-10 h-full flex flex-col justify-end
                                                        px-5 pb-14 md:pb-16 pt-24 max-w-3xl">
                                            <span className="inline-flex items-center gap-1.5 self-start
                                                             px-2.5 py-1 rounded-full mb-3
                                                             bg-white/[0.18] backdrop-blur-md
                                                             text-[10px] font-bold uppercase tracking-wider
                                                             text-white/95">
                                                <Sparkles className="w-3 h-3" />
                                                {s.eyebrow}
                                            </span>
                                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold
                                                           leading-[1.05] tracking-tight text-white
                                                           whitespace-pre-line">
                                                {s.title}
                                            </h1>
                                            <p className="mt-3 text-[13px] md:text-base text-white/85
                                                          max-w-xl leading-relaxed">
                                                {s.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Dots */}
                            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20
                                            flex items-center gap-1.5">
                                {HERO_SLIDES.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            tap();
                                            goToSlide(i);
                                        }}
                                        aria-label={`Slide ${i + 1}`}
                                        className={`transition-all duration-300 rounded-full
                                            ${i === slide
                                                ? 'w-6 h-1.5 bg-white'
                                                : 'w-1.5 h-1.5 bg-white/50'
                                            }`}
                                        style={{ touchAction: 'manipulation' }}
                                    />
                                ))}
                            </div>

                            {/* Arrows */}
                            <button
                                onClick={() => {
                                    tap();
                                    goToSlide(slide - 1);
                                }}
                                aria-label="Previous slide"
                                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20
                                           h-10 w-10 items-center justify-center rounded-full
                                           bg-black/40 text-white
                                           active:scale-[0.92] transition-transform"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => {
                                    tap();
                                    goToSlide(slide + 1);
                                }}
                                aria-label="Next slide"
                                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20
                                           h-10 w-10 items-center justify-center rounded-full
                                           bg-black/40 text-white
                                           active:scale-[0.92] transition-transform"
                                style={{ touchAction: 'manipulation' }}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </section>

                        {/* ── HERO CTA — Browse Groups ONLY ──────── */}
                        <section className="relative z-10 -mt-6 px-4 md:px-0">
                            <div className="mx-auto max-w-2xl rounded-2xl
                                            bg-white dark:bg-[#161b22]
                                            p-2">
                                <Button
                                    onClick={handleBrowseGroups}
                                    className="w-full h-11 rounded-xl
                                               bg-slate-100 dark:bg-white/[0.06]
                                               text-slate-900 dark:text-white
                                               font-bold text-sm
                                               active:scale-[0.97] transition-transform
                                               gap-2"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <Users className="w-4 h-4" />
                                    Browse groups
                                </Button>
                            </div>
                        </section>

                        {/* ── SOLO NUDGE ─────────────────────────── */}
                        {!userIsInAnyGroup && (
                            <section className="px-4 md:px-0 pt-5 pb-3 md:pb-5">
                                <SoloSubscriptionCard role={user?.role ?? null} />
                            </section>
                        )}

                        {/* ── SEARCH ─────────────────────────────── */}
                        <section
                            id="groups-section"
                            className="px-4 md:px-0 pt-5 pb-3 md:pb-5"
                        >
                            <div className="flex items-end justify-between mb-2 px-1">
                                <div>
                                    <h2 className="text-base md:text-lg font-bold tracking-tight
                                                   text-slate-900 dark:text-white">
                                        Find a group
                                    </h2>
                                    <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Search by school, course, or group name
                                    </p>
                                </div>
                            </div>
                            <SearchFilters
                                search={filters.search}
                                school={filters.school}
                                course={filters.course}
                                sort={filters.sort}
                                onSearchChange={(v) => updateFilters({ search: v })}
                                onSchoolChange={(v) => updateFilters({ school: v })}
                                onCourseChange={(v) => updateFilters({ course: v })}
                                onSortChange={(v) => updateFilters({ sort: v })}
                            />
                        </section>

                        {/* ── GROUPS GRID ────────────────────────── */}
                        <section className="px-4 md:px-0 pb-8">
                            {groups.length === 0 ? (
                                <EmptyState
                                    hasFilters={
                                        !!(filters.search || filters.school || filters.course)
                                    }
                                    onCreate={handleCreateGroup}
                                />
                            ) : (
                                <>
                                    <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base md:text-lg font-bold tracking-tight
                                                           text-slate-900 dark:text-white">
                                                Active groups
                                            </h2>
                                            <span className="inline-flex items-center
                                                             h-5 px-2 rounded-full
                                                             bg-slate-100 dark:bg-white/[0.06]
                                                             text-slate-600 dark:text-slate-300
                                                             text-[10px] font-bold tabular-nums">
                                                {groups.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
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

            {/* ── Floating Create FAB (WhatsApp style) ─────────── */}
            <button
                onClick={handleCreateGroup}
                aria-label="Create group"
                className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+20px)] right-5 z-40
                           h-14 w-14 rounded-full
                           bg-emerald-600 text-white
                           shadow-sm
                           flex items-center justify-center
                           active:scale-[0.92] transition-transform"
                style={{ touchAction: 'manipulation' }}
            >
                <Plus className="h-6 w-6" strokeWidth={2.75} />
            </button>

            {/* Local styles */}
            <style>{`
                .scrollbar-none::-webkit-scrollbar { display: none; }
                .safe-top { padding-top: max(env(safe-area-inset-top), 0px); }
                .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 0px); }
            `}</style>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Empty state — token palette
   ───────────────────────────────────────────────────────────── */
function EmptyState({
    hasFilters,
    onCreate,
}: {
    hasFilters: boolean;
    onCreate: () => void;
}) {
    return (
        <Card className="rounded-2xl bg-white dark:bg-[#161b22] shadow-none border-0">
            <CardContent className="flex flex-col items-center justify-center py-14 px-5">
                <div className="h-14 w-14 rounded-2xl
                                bg-slate-100 dark:bg-white/[0.06]
                                flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-base font-bold tracking-tight
                               text-slate-900 dark:text-white mb-1.5 text-center text-balance">
                    {hasFilters
                        ? 'No groups match your filters'
                        : 'Be the first to start a group'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center
                              max-w-sm leading-relaxed text-balance">
                    {hasFilters
                        ? 'Try adjusting your search or clear the filters to see every group.'
                        : 'Create a group with your classmates and split the cost of premium access. The more join, the cheaper it gets for everyone.'}
                </p>
                {!hasFilters && (
                    <button
                        onClick={onCreate}
                        className="mt-5 h-10 px-4 rounded-xl
                                   bg-emerald-600 text-white
                                   text-sm font-bold
                                   flex items-center gap-1.5
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <Plus className="h-4 w-4" />
                        Create the first group
                    </button>
                )}
            </CardContent>
        </Card>
    );
}

/* ─────────────────────────────────────────────────────────────
   Skeleton
   ───────────────────────────────────────────────────────────── */
function SkeletonLayout() {
    return (
        <div className="w-full md:max-w-6xl md:mx-auto md:px-4 md:pt-4 pb-32 safe-bottom">
            <Skeleton className="h-[58vh] md:h-[440px] md:rounded-2xl border-0" />

            <div className="relative z-10 -mt-6 px-4 md:px-0">
                <div className="mx-auto max-w-2xl rounded-2xl p-2
                                bg-white dark:bg-[#161b22]">
                    <Skeleton className="h-11 w-full rounded-xl border-0" />
                </div>
            </div>

            <section className="px-4 md:px-0 pt-5 pb-3">
                <Skeleton className="h-5 w-40 mb-3 rounded-lg border-0" />
                <Skeleton className="h-11 w-full rounded-xl border-0" />
            </section>

            <section className="px-4 md:px-0 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card
                            key={i}
                            className="p-4 rounded-2xl bg-white dark:bg-[#161b22] shadow-none border-0"
                        >
                            <Skeleton className="h-5 w-3/4 mb-3 rounded-lg border-0" />
                            <Skeleton className="h-3.5 w-1/2 mb-4 rounded-lg border-0" />
                            <Skeleton className="h-3.5 w-full mb-2 rounded-lg border-0" />
                            <Skeleton className="h-3.5 w-2/3 rounded-lg border-0" />
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}