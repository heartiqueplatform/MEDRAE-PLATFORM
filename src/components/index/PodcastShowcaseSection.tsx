import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Headphones, Play, Mic2, Heart, Brain, Sparkles,
    Radio, Users, Stethoscope, GraduationCap,
    Coffee, Laugh, ShieldCheck, TrendingUp, ChevronRight,
    CircleDot, Quote
} from 'lucide-react';
import { usePodcastShows } from '@/hooks/usePodcastShows';

// ─────────────────────────────────────────────────────────────
// Scroll reveal
// ─────────────────────────────────────────────────────────────
const useInView = (options: IntersectionObserverInit = {}) => {
    const [inView, setInView] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true);
                obs.unobserve(entry.target);
            }
        }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px', ...options });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return [ref, inView] as const;
};

// ─────────────────────────────────────────────────────────────
// Waveform (static-ish, subtle animation)
// ─────────────────────────────────────────────────────────────
const Waveform = ({ bars = 28, className = '' }: { bars?: number; className?: string }) => (
    <div className={`flex items-center justify-center gap-[3px] ${className}`}>
        {Array.from({ length: bars }).map((_, i) => {
            const base = 4 + Math.abs(Math.sin(i * 0.7)) * 18;
            return (
                <span
                    key={i}
                    className="w-[2px] rounded-full bg-current opacity-70 wave-bar"
                    style={{
                        height: `${base}px`,
                        animationDelay: `${i * 0.045}s`,
                        animationDuration: `${1.1 + (i % 5) * 0.15}s`,
                    }}
                />
            );
        })}
    </div>
);

// ─────────────────────────────────────────────────────────────
// Benefit row
// ─────────────────────────────────────────────────────────────
const BenefitRow = ({
    icon: Icon,
    title,
    desc,
    delay,
}: {
    icon: any;
    title: string;
    desc: string;
    delay: number;
}) => {
    const [ref, inView] = useInView();
    return (
        <div
            ref={ref}
            className="group flex gap-4 py-4 border-b border-white/[0.06] last:border-b-0"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            }}
        >
            <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.06] group-hover:bg-white/[0.1] transition-colors duration-300">
                <Icon className="w-5 h-5 text-blue-400" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 pt-0.5">
                <p className="text-[15px] font-semibold text-white leading-tight tracking-tight">
                    {title}
                </p>
                <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">
                    {desc}
                </p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Show card (real data)
// ─────────────────────────────────────────────────────────────
const ShowCard = ({ show, index }: { show: any; index: number }) => {
    const [ref, inView] = useInView();
    const initial = (show?.title || '?').trim().charAt(0).toUpperCase();

    return (
        <div
            ref={ref}
            className="group relative shrink-0 w-[148px] md:w-[168px]"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.55s ease ${index * 60}ms, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${index * 60}ms`,
            }}
        >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-800 ring-1 ring-white/[0.08] group-hover:ring-white/20 transition-all duration-500">
                {show?.artwork_url ? (
                    <img
                        src={show.artwork_url}
                        alt={show.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white text-4xl font-black">
                        {initial}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-[3px] rounded-full bg-red-500/95">
                    <CircleDot className="w-2.5 h-2.5 text-white animate-pulse" />
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">New</span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[12px] font-bold text-white leading-tight line-clamp-2 tracking-tight">
                        {show.title}
                    </p>
                    <p className="text-[10px] text-slate-300/90 mt-1 font-medium">
                        {show.episode_count || 0} episodes
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Fallback cards
// ─────────────────────────────────────────────────────────────
const FALLBACK_SHOWS = [
    { title: 'Clinical Insights', tag: 'Real cases from the ward' },
    { title: 'Night Shift Stories', tag: 'Honest talk on burnout' },
    { title: 'Exam Room', tag: 'NCK & FQEs decoded' },
    { title: 'Nursing Laughs', tag: 'Because you need it' },
    { title: 'New Nurse Diaries', tag: 'From student to staff' },
    { title: 'Global Pathways', tag: 'NCLEX & beyond' },
];

const FallbackCard = ({ title, tag, index }: { title: string; tag: string; index: number }) => {
    const [ref, inView] = useInView();
    return (
        <div
            ref={ref}
            className="group shrink-0 w-[148px] md:w-[168px]"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.55s ease ${index * 60}ms, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${index * 60}ms`,
            }}
        >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/[0.04] ring-1 ring-white/[0.08] group-hover:ring-white/20 transition-all duration-500">
                <div className="absolute inset-0 flex items-center justify-center">
                    <Headphones className="w-14 h-14 text-slate-500 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-500" strokeWidth={1.5} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-[12px] font-bold text-white leading-tight tracking-tight">
                        {title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {tag}
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
const PodcastShowcaseSection = () => {
    const navigate = useNavigate();
    const { shows, loading } = usePodcastShows();

    const [headerRef, headerInView] = useInView({ threshold: 0.2 });
    const [visualRef, visualInView] = useInView({ threshold: 0.15 });

    const featuredShows = useMemo(() => {
        if (!shows?.length) return [];
        return [...shows]
            .sort((a: any, b: any) => (b.endorsement_count || 0) - (a.endorsement_count || 0))
            .slice(0, 6);
    }, [shows]);

    const hasRealShows = !loading && featuredShows.length > 0;

    return (
        <section
            id="podcasts"
            className="relative w-full py-20 md:py-28 px-0 md:px-6 overflow-hidden bg-[#0d1117]"
        >
            <div className="relative max-w-7xl mx-auto px-5 md:px-0">

                {/* ═════════════ HEADER ═════════════ */}
                <div
                    ref={headerRef}
                    className="max-w-3xl mb-14 md:mb-20"
                    style={{
                        opacity: headerInView ? 1 : 0,
                        transform: headerInView ? 'translateY(0)' : 'translateY(28px)',
                        transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >

                    <h2 className="text-[34px] md:text-5xl lg:text-[56px] font-black tracking-[-0.03em] text-white leading-[1.02]">
                        More than a study app.
                        <br />
                        <span className="text-blue-400">
                            It's your nursing companion.
                        </span>
                    </h2>

                    <p className="mt-6 text-[15px] md:text-lg text-slate-400 max-w-xl font-medium leading-relaxed">
                        Hand-picked nursing podcasts   real voices from the ward, exam-focused
                        breakdowns, honest talk on burnout, and only thing that only nurses understand.
                        <span className="text-slate-200"> All inside Medrae.</span>
                    </p>
                </div>

                {/* ═════════════ MAIN GRID ═════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center mb-16 md:mb-24">

                    {/* ── LEFT: Preview mockup ── */}
                    <div
                        ref={visualRef}
                        className="relative flex justify-center lg:justify-start"
                        style={{
                            opacity: visualInView ? 1 : 0,
                            transform: visualInView ? 'translateY(0)' : 'translateY(40px)',
                            transition: 'opacity 0.9s ease 0.1s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
                        }}
                    >
                        {/* Phone */}
                        <div className="relative w-[268px] md:w-[300px] aspect-[9/17.5] rounded-[2.75rem] p-[7px] bg-slate-800 ring-1 ring-white/[0.08]">
                            <div className="relative w-full h-full rounded-[2.35rem] overflow-hidden bg-[#161b22]">

                                {/* status bar */}
                                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                                    <span className="text-[10px] font-semibold text-slate-500 tracking-tight">9:41</span>
                                    <div className="w-14 h-[18px] bg-black rounded-full" />
                                    <div className="flex items-center gap-1">
                                        <span className="w-3 h-2.5 border border-slate-600 rounded-[2px] relative">
                                            <span className="absolute inset-[2px] right-1 bg-slate-400 rounded-[1px]" />
                                        </span>
                                    </div>
                                </div>

                                {/* header */}
                                <div className="px-6 flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-400">
                                        Now Playing
                                    </p>
                                    <Radio className="w-3.5 h-3.5 text-slate-500" />
                                </div>

                                {/* artwork */}
                                <div className="px-6 mt-5">
                                    <div className="relative aspect-square rounded-2xl overflow-hidden ring-1 ring-white/[0.08]">
                                        {featuredShows[0]?.artwork_url ? (
                                            <img
                                                src={featuredShows[0].artwork_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                <Headphones className="w-20 h-20 text-slate-600" strokeWidth={1.4} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                                        <div className="absolute bottom-4 left-4 right-4 text-white/90">
                                            <Waveform bars={32} />
                                        </div>
                                    </div>
                                </div>

                                {/* track info */}
                                <div className="px-6 mt-6">
                                    <p className="text-[15px] font-bold text-white leading-tight tracking-tight line-clamp-2">
                                        {featuredShows[0]?.title || 'Clinical Insights Daily'}
                                    </p>
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mt-1.5">
                                        Medrae Originals
                                    </p>
                                </div>

                                {/* progress */}
                                <div className="px-6 mt-5">
                                    <div className="w-full h-[3px] rounded-full bg-white/[0.08] overflow-hidden">
                                        <div className="h-full w-[42%] rounded-full bg-blue-500" />
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        <span className="text-[9px] text-slate-500 font-medium tabular-nums">12:04</span>
                                        <span className="text-[9px] text-slate-500 font-medium tabular-nums">28:30</span>
                                    </div>
                                </div>

                                {/* controls */}
                                <div className="px-6 mt-5 flex items-center justify-center gap-6">
                                    <button className="text-slate-500 hover:text-white transition-colors">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                                        </svg>
                                    </button>
                                    <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center">
                                        <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
                                    </div>
                                    <button className="text-slate-500 hover:text-white transition-colors">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* up next mini list */}
                                <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4 bg-gradient-to-t from-[#161b22] via-[#161b22]/95 to-transparent">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                                            Up Next
                                        </span>
                                        <div className="flex-1 h-px bg-white/[0.06]" />
                                    </div>
                                    <div className="space-y-2">
                                        {(hasRealShows ? featuredShows.slice(1, 3) : FALLBACK_SHOWS.slice(1, 3)).map((s: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-800 shrink-0 ring-1 ring-white/[0.06]">
                                                    {s.artwork_url ? (
                                                        <img src={s.artwork_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-700" />
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400 truncate font-medium">
                                                    {s.title}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Benefits list ── */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl md:text-3xl lg:text-[34px] font-black text-white tracking-[-0.02em] leading-[1.15]">
                                Built for the nurse
                                <br />
                                <span className="text-slate-500">who's got a full plate.</span>
                            </h3>
                        </div>

                        <div className="border-t border-white/[0.06]">
                            <BenefitRow
                                icon={Stethoscope}
                                title="Clinical insights from the ward"
                                desc="Real cases, real decisions   from practising nurses who've been there."
                                delay={0}
                            />
                            <BenefitRow
                                icon={Brain}
                                title="Stay sharp for NCK & FQEs"
                                desc="Evidence-based updates that keep you exam-ready, without the textbook grind."
                                delay={70}
                            />
                            <BenefitRow
                                icon={Heart}
                                title="Honest emotional support"
                                desc="Candid conversations on burnout, fear, and resilience. You're not alone."
                                delay={140}
                            />
                            <BenefitRow
                                icon={Laugh}
                                title="Nursing comedy that hits"
                                desc="Because laughter is the best medicine   and only nurses get the joke."
                                delay={210}
                            />
                            <BenefitRow
                                icon={Coffee}
                                title="Turn dead time into growth"
                                desc="Commute, dishes, gym   every pocket of your day becomes study time."
                                delay={280}
                            />
                            <BenefitRow
                                icon={ShieldCheck}
                                title="Curated. Verified. Zero fluff."
                                desc="Every show hand-picked by the Medrae team. If it doesn't help nurses, it's out."
                                delay={350}
                            />
                        </div>

                        {/* CTA */}
                        <div className="pt-2">
                            <button
                                onClick={() => navigate('/register')}
                                className="group inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white text-slate-900 font-black text-[14px] tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                            >
                                <Headphones className="w-[18px] h-[18px]" strokeWidth={2.4} />
                                Unlock the Podcast Network
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2.6} />
                            </button>
                            <p className="text-[12px] text-slate-500 mt-3.5 font-medium">
                                Free with your Medrae account. No extra subscription.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ═════════════ SHOWS RAIL ═════════════ */}
                <div className="relative">
                    <div className="flex items-end justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Radio className="w-4 h-4 text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-400">
                                    Inside the app
                                </span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-[-0.02em]">
                                {hasRealShows ? 'Trending in the nursing community' : 'Shows waiting for you'}
                            </h3>
                        </div>
                        <button
                            onClick={() => navigate('/register')}
                            className="hidden sm:flex items-center gap-1 text-[13px] font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            See all
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
                        {hasRealShows
                            ? featuredShows.map((show: any, i: number) => (
                                <ShowCard key={show.id || i} show={show} index={i} />
                            ))
                            : FALLBACK_SHOWS.map((s, i) => (
                                <FallbackCard key={i} title={s.title} tag={s.tag} index={i} />
                            ))}
                    </div>
                </div>

                {/* ═════════════ QUOTE STRIP ═════════════ */}
                <div className="mt-20 md:mt-28 max-w-3xl">
                    <Quote className="w-8 h-8 text-blue-400/40 mb-4" strokeWidth={2} />
                    <p className="text-xl md:text-2xl lg:text-[28px] font-semibold text-slate-200 leading-[1.35] tracking-tight">
                        "I listen on my way to placement. It's the only reason
                        I still feel like a nurse and not just a student cramming for exams."
                    </p>
                    <div className="flex items-center gap-3 mt-5">
                        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-[13px] font-black">
                            SK
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-white tracking-tight">Sarah K.</p>
                            <p className="text-[11px] text-slate-500 font-medium">BSN Student · Nairobi</p>
                        </div>
                    </div>
                </div>

                {/* ═════════════ TRUST STRIP ═════════════ */}
                <div className="mt-20 md:mt-24 pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-6">
                    {[
                        { icon: Users, label: '2,231+ listeners' },
                        { icon: GraduationCap, label: 'All cadres' },
                        { icon: Sparkles, label: 'Updated weekly' },
                        { icon: TrendingUp, label: 'Free with Medrae' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                            <item.icon className="w-4 h-4 text-slate-500" strokeWidth={2.2} />
                            <span className="text-[11px] md:text-[12px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Scoped animations ── */}
            <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.35); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        .wave-bar {
          transform-origin: center;
          animation: wave 1.2s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar { height: 0; display: none; }
        .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
        </section>
    );
};

export default PodcastShowcaseSection;