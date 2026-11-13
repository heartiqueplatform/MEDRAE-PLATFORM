// src/components/index/PodcastShowcaseSection.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Headphones, Play, Heart, Brain, Sparkles, Radio, Users,
    Stethoscope, GraduationCap, Coffee, TrendingUp, ChevronRight, CircleDot,
    Globe, BookOpen, Award, Zap, Star,
} from "lucide-react";
import { usePodcastShows } from "@/hooks/usePodcastShows";

/* ── Scroll reveal ── */
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
        }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px", ...options });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return [ref, inView] as const;
};

/* ── Compact waveform ── */
const Waveform = ({ bars = 22 }: { bars?: number }) => (
    <div className="flex items-center justify-center gap-[3px] text-blue-500">
        {Array.from({ length: bars }).map((_, i) => {
            const base = 3 + Math.abs(Math.sin(i * 0.7)) * 12;
            return (
                <span
                    key={i}
                    className="w-[2px] rounded-full bg-current opacity-80 wave-bar"
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

/* ── Benefit row ── */
const BenefitRow = ({
    icon: Icon, title, desc, delay,
}: {
    icon: any; title: string; desc: string; delay: number;
}) => {
    const [ref, inView] = useInView();
    return (
        <div
            ref={ref}
            className="flex gap-3 py-2.5 border-b border-slate-200/70 last:border-b-0"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(12px)",
                transition: `opacity 0.45s ease ${delay}ms, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            }}
        >
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50">
                <Icon className="w-4 h-4 text-blue-600" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-bold text-slate-900 leading-tight">{title}</p>
                <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
};

/* ── Show tile ── */
const ShowTile = ({ show, index }: { show: any; index: number }) => {
    const [ref, inView] = useInView();
    const initial = (show?.title || "?").trim().charAt(0).toUpperCase();
    return (
        <div
            ref={ref}
            className="group shrink-0 w-[128px] md:w-[144px]"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(12px)",
                transition: `opacity 0.45s ease ${index * 40}ms, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 40}ms`,
            }}
        >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 transition-all duration-300">
                {show?.artwork_url ? (
                    <img
                        src={show.artwork_url}
                        alt={show.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-3xl font-bold">
                        {initial}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-[2px] rounded-full bg-red-500/95">
                    <CircleDot className="w-2 h-2 text-white animate-pulse" />
                    <span className="text-[8px] text-white font-bold uppercase tracking-wider">New</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-[11px] font-bold text-white leading-tight line-clamp-2">{show.title}</p>
                    <p className="text-[9px] text-slate-200/90 mt-0.5 font-medium">
                        {show.episode_count || 0} episodes
                    </p>
                </div>
            </div>
        </div>
    );
};

const FallbackTile = ({ title, tag, index }: { title: string; tag: string; index: number }) => {
    const [ref, inView] = useInView();
    return (
        <div
            ref={ref}
            className="group shrink-0 w-[128px] md:w-[144px]"
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(12px)",
                transition: `opacity 0.45s ease ${index * 40}ms, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 40}ms`,
            }}
        >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-violet-50 transition-all duration-300">
                <div className="absolute inset-0 flex items-center justify-center">
                    <Headphones className="w-10 h-10 text-blue-300 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-500" strokeWidth={1.5} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-[11px] font-bold text-slate-900 leading-tight">{title}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-medium">{tag}</p>
                </div>
            </div>
        </div>
    );
};

const FALLBACK_SHOWS = [
    { title: "Clinical Insights", tag: "Real cases" },
    { title: "Night Shift Stories", tag: "Burnout talk" },
    { title: "Exam Room", tag: "NCK decoded" },
    { title: "Nursing Laughs", tag: "Comedy" },
    { title: "New Nurse Diaries", tag: "Student → staff" },
    { title: "Global Pathways", tag: "NCLEX" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function PodcastShowcaseSection() {
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
            className="relative w-full py-10 md:py-14 px-4 md:px-6 overflow-hidden bg-slate-50"
        >
            <div className="relative max-w-6xl mx-auto">

                {/* ── HEADER ── */}
                <div
                    ref={headerRef}
                    className="max-w-2xl mb-8 md:mb-10"
                    style={{
                        opacity: headerInView ? 1 : 0,
                        transform: headerInView ? "translateY(0)" : "translateY(16px)",
                        transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                >
                    <h2 className="text-[28px] md:text-4xl lg:text-[42px] font-bold tracking-[-0.02em] text-slate-900 leading-[1.05]">
                        More than a study app.
                        <br />
                        <span className="text-blue-600">It's your nursing companion.</span>
                    </h2>
                    <p className="mt-3 text-[14px] md:text-[15px] text-slate-500 max-w-lg leading-relaxed">
                        Hand-picked nursing podcasts  real voices from the ward, exam breakdowns,
                        honest talk on burnout. All inside Medrae.
                    </p>
                </div>

                {/* ── TWO-COLUMN BLOCK ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_1fr] gap-6 lg:gap-10 items-start mb-10 md:mb-14">

                    {/* LEFT: Phone mockup */}
                    <div
                        ref={visualRef}
                        className="relative flex justify-center lg:justify-start lg:sticky lg:top-8"
                        style={{
                            opacity: visualInView ? 1 : 0,
                            transform: visualInView ? "translateY(0)" : "translateY(24px)",
                            transition: "opacity 0.7s ease 0.1s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
                        }}
                    >
                        <div className="relative w-[200px] md:w-[240px] aspect-[9/17.5] rounded-[2.2rem] p-[6px] bg-slate-800">
                            <div className="relative w-full h-full rounded-[1.9rem] overflow-hidden bg-white">
                                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                                    <span className="text-[9px] font-semibold text-slate-500">9:41</span>
                                    <div className="w-12 h-[14px] bg-black rounded-full" />
                                    <span className="w-2.5 h-2 border border-slate-400 rounded-[2px]" />
                                </div>

                                <div className="px-5 flex items-center justify-between">
                                    <p className="text-[9px] uppercase tracking-[0.25em] text-blue-600 font-bold">
                                        Now Playing
                                    </p>
                                    <Radio className="w-3 h-3 text-slate-400" />
                                </div>

                                <div className="px-5 mt-3">
                                    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                                        {featuredShows[0]?.artwork_url ? (
                                            <img src={featuredShows[0].artwork_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center">
                                                <Headphones className="w-14 h-14 text-blue-400" strokeWidth={1.4} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                                        <div className="absolute bottom-3 left-3 right-3 text-blue-500">
                                            <Waveform bars={24} />
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 mt-3">
                                    <p className="text-[12px] font-bold text-slate-900 leading-tight line-clamp-2">
                                        {featuredShows[0]?.title || "Clinical Insights Daily"}
                                    </p>
                                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-[0.2em] mt-1">
                                        Medrae Originals
                                    </p>
                                </div>

                                <div className="px-5 mt-2.5">
                                    <div className="w-full h-[2px] rounded-full bg-slate-200 overflow-hidden">
                                        <div className="h-full w-[42%] rounded-full bg-blue-500" />
                                    </div>
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-[8px] text-slate-500 font-medium">12:04</span>
                                        <span className="text-[8px] text-slate-500 font-medium">28:30</span>
                                    </div>
                                </div>

                                <div className="px-5 mt-2.5 flex items-center justify-center gap-5">
                                    <button className="text-slate-400 hover:text-slate-700 transition-colors">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                                    </button>
                                    <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center">
                                        <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-700 transition-colors">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Rich editorial copy + benefits */}
                    <div className="min-w-0">
                        <h3 className="text-xl md:text-2xl lg:text-[26px] font-bold text-slate-900 tracking-[-0.01em] leading-tight">
                            Built for the nurse{" "}
                            <span className="text-slate-400">who's got a full plate.</span>
                        </h3>

                        {/* 🆕 Intro paragraph */}
                        <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">
                            Nursing school is heavy. The wards are heavier. Between lectures, clinical
                            rotations, assignments, and exam prep, most nurses barely have time to eat,
                            let alone sit down and read a textbook. That's exactly why podcasts work
                            they slide into the gaps. Your commute, your dishes, your gym session, the
                            three minutes you spend queuing for tea. <b>Every pocket of dead time
                                becomes a study session.</b>
                        </p>

                        {/* 🆕 Why Medrae podcasts */}
                        <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">
                            We don't dump every nursing podcast on the internet into Medrae. Every
                            show is <b>hand-picked by our team</b>  verified nurses, real clinical
                            educators, and voices that have actually stood on a ward in Kenya or
                            worked abroad. If it doesn't help a nurse learn, grow, or cope, it's not
                            here. No fluff. No filler. No random influencers with a microphone.
                        </p>

                        {/* 🆕 Global + Apple Podcasts angle */}
                        <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">
                            And yes  <b>every episode is pulled from Apple Podcasts</b>, which means
                            you get the same production quality, the same credibility, and the same
                            globally recognized voices that nurses in London, Toronto, Sydney, and
                            Nairobi are already listening to. But you get them <b>curated for the
                                Kenyan nurse</b>  filtered by cadre, by exam relevance, by clinical
                            specialty, and by career stage.
                        </p>

                        {/* 🆕 Global pathway block  the dream angle */}
                        <div className="mt-5 py-4 border-y border-slate-200/70">
                            <div className="flex items-start gap-2.5 mb-2">
                                <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" strokeWidth={2.4} />
                                <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                    For the nurse dreaming of working abroad
                                </p>
                            </div>
                            <p className="text-[13.5px] text-slate-600 leading-relaxed">
                                Every Kenyan nurse knows the dream  NCLEX, NMC UK, AHPRA Australia,
                                CNO Canada. And the exam is only half the story. The other half is
                                <b> understanding how nurses actually work, talk, and think in those
                                    countries.</b> Which podcasts teach you the clinical culture you'll
                                be walking into? Where do you hear practising ICU nurses in the US
                                talk through a rapid response, or NHS nurses describe their escalation
                                protocols, or Canadian nurses explain their scope of practice?{" "}
                                <b>Right here.</b> The Medrae podcast library is the closest thing
                                you'll find to free "cultural ward immersion" before you fly out
                                updated weekly, sourced from the same feeds your future colleagues
                                are listening to.
                            </p>
                        </div>

                        {/* Benefits list */}
                        <div className="mt-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                                What you get from every episode
                            </p>
                            <div className="border-t border-slate-200/70">
                                <BenefitRow
                                    icon={Stethoscope}
                                    title="Clinical insight from practising nurses"
                                    desc="Real cases, real decisions, real patients  the kind of judgement you can't get from a textbook."
                                    delay={0}
                                />
                                <BenefitRow
                                    icon={Brain}
                                    title="Stay sharp for NCK, FQEs, and NCLEX"
                                    desc="Evidence-based refreshers that keep you exam-ready without the grind of extra reading."
                                    delay={50}
                                />
                                <BenefitRow
                                    icon={Heart}
                                    title="Honest emotional support  not motivation fluff"
                                    desc="Candid conversations about burnout, fear, grief, and resilience from nurses who've been through it."
                                    delay={100}
                                />
                                <BenefitRow
                                    icon={Coffee}
                                    title="Turn every pocket of dead time into growth"
                                    desc="Commute, dishes, gym, queueing for tea  none of it needs to be wasted anymore."
                                    delay={150}
                                />
                                <BenefitRow
                                    icon={Globe}
                                    title="Prepare for work abroad before you land"
                                    desc="Hear how nurses think and talk in the US, UK, Canada, and Australia  before your first shift."
                                    delay={200}
                                />
                                <BenefitRow
                                    icon={Star}
                                    title="Every episode hand-picked, nothing wasted"
                                    desc="We curate aggressively. If it doesn't help a Kenyan nurse learn, grow, or cope, it doesn't make the library."
                                    delay={250}
                                />
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-6">
                            <button
                                onClick={() => navigate("/register")}
                                className="group inline-flex items-center gap-2
                                           px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
                                           text-white text-[13px] font-bold
                                           hover:scale-[1.02] active:scale-[0.97]
                                           transition-all duration-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Headphones className="w-4 h-4" strokeWidth={2.4} />
                                Unlock the Podcast Network
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.6} />
                            </button>
                            <p className="text-[11px] text-slate-500 mt-2 font-medium">
                                Free with your Medrae account · Updated weekly · No extra subscription
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── SHOWS RAIL ── */}
                <div>
                    <div className="flex items-end justify-between mb-3">
                        <div>
                            <p className="text-[9px] uppercase tracking-[0.25em] text-blue-600 font-bold mb-1">
                                Inside the app
                            </p>
                            <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                                {hasRealShows ? "Trending in the community" : "Shows waiting for you"}
                            </h3>
                        </div>
                        <button
                            onClick={() => navigate("/register")}
                            className="hidden sm:flex items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-slate-900 transition-colors"
                            style={{ touchAction: "manipulation" }}
                        >
                            See all <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                        {hasRealShows
                            ? featuredShows.map((show: any, i: number) => (
                                <ShowTile key={show.id || i} show={show} index={i} />
                            ))
                            : FALLBACK_SHOWS.map((s, i) => (
                                <FallbackTile key={i} title={s.title} tag={s.tag} index={i} />
                            ))}
                    </div>
                </div>

                {/* ── TRUST ROW ── */}
                <div className="mt-6 pt-5 border-t border-slate-200/70 flex flex-wrap items-center justify-center lg:justify-between gap-3">
                    {[
                        { icon: Users, label: "2,231+ listeners" },
                        { icon: GraduationCap, label: "All cadres" },
                        { icon: Sparkles, label: "Updated weekly" },
                        { icon: TrendingUp, label: "Free with Medrae" },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <item.icon className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.2} />
                            <span className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">
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
}