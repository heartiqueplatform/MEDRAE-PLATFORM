import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Trophy,
    Award,
    GraduationCap,
    Stethoscope,
    ShieldCheck,
    BookOpenCheck,
    ClipboardList,
    BarChart3,
    Users,
    Calendar,
    BadgeCheck,
    Sparkles,
    ArrowRight,
    CheckCircle,
    HeartPulse,
    FileCheck2,
    Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

// ============================================================
// ANIMATION UTILITY: Intersection Observer for scroll animations
// ============================================================
const useIntersectionObserver = (options = {}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px',
            ...options
        });

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [options]);

    return [ref, isVisible];
};

const NursingMeritCupSection = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: BookOpenCheck,
            title: "Two-Month Academic Program",
            description: "A structured eight-week revision programme with daily quizzes and three full mock NCK-style exams. Built to keep you consistent, not cramming.",
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            icon: ShieldCheck,
            title: "Academic Olympiad",
            description: "Modelled on the Kenya Science and Engineering Fair. A genuine pursuit of nursing excellence in the spirit of Florence Nightingale.",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
        {
            icon: Trophy,
            title: "National Merit Ranking",
            description: "A credible, verifiable national ranking based purely on final exam performance — something you can confidently list on your CV.",
            color: "text-amber-600",
            bg: "bg-amber-50",
        },
        {
            icon: Award,
            title: "Merit Awards & Recognition",
            description: "Top performers receive cash merit awards, the Nightingale Trophy, free premium access, sponsored CPD workshops, and recommendation letters.",
            color: "text-purple-600",
            bg: "bg-purple-50",
        },
        {
            icon: ClipboardList,
            title: "CPD for Staff Nurses",
            description: "Staff nurses and tutors compete in their own category and earn CPD points and a CPD certificate upon completion.",
            color: "text-indigo-600",
            bg: "bg-indigo-50",
        },
        {
            icon: BarChart3,
            title: "Daily Leaderboard",
            description: "Keep a daily streak, climb the national leaderboard, and stay motivated through two months of focused practice.",
            color: "text-rose-600",
            bg: "bg-rose-50",
        },
    ];

    const categories = [
        {
            icon: GraduationCap,
            title: "KMTC Students",
            subtitle: "Year 1 – 3",
            description: "Registered nursing students in any KMTC or NCK-accredited diploma programme.",
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            icon: Stethoscope,
            title: "Interns & New Graduates",
            subtitle: "Post-Graduation",
            description: "Nurses in internship or within their first year of practice preparing for the NCK exam.",
            color: "text-purple-600",
            bg: "bg-purple-50",
        },
        {
            icon: BadgeCheck,
            title: "Staff Nurses & Tutors",
            subtitle: "CPD Included",
            description: "Practising nurses and tutors who want to benchmark their knowledge and earn CPD recognition.",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
    ];

    return (
        <section className="py-12 md:py-20 px-0 md:px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans antialiased">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10 md:mb-16 px-4 md:px-0">
                    <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4">
                        <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        New on Medrae
                    </div>
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-3 md:mb-4">
                        Medrae National Nursing{" "}
                        <span className="text-blue-600 italic">Merit Cup</span>
                    </h2>
                    <p className="text-sm md:text-lg text-slate-600 md:max-w-full md:px-4 lg:px-6 mx-auto font-medium">
                        Kenya&rsquo;s first nationwide nursing excellence
                        olympiad. A two-month academic program that builds you
                        into a stronger nurse — and crowns the top performers
                        in a national merit ranking.
                    </p>
                </div>

                {/* What Is It — plain explanation card (no gradient) */}
                <div className="bg-white rounded-2xl p-6 md:p-10 mb-10 md:mb-12 mx-3 md:mx-0 shadow-sm border border-slate-100">
                    <div className="max-w-3xl mx-auto text-center">
                        <h3 className="text-lg md:text-2xl font-black text-slate-900 mb-3 md:mb-4">
                            An Academic Competition, Not a Game of Chance
                        </h3>
                        <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-4">
                            The Merit Cup is Kenya&rsquo;s first academic
                            olympiad dedicated to nursing excellence. Think of
                            it the way you think of the Kenya Science and
                            Engineering Fair or the Kenya Music Festival — a
                            serious pursuit of skill, knowledge, and merit.
                        </p>
                        <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                            Participants commit to two months of structured
                            revision, complete three mock NCK-style exams, and
                            sit a supervised final merit exam. The top
                            performers are recognised nationally. Every
                            participant — regardless of rank — receives two
                            months of Medrae Premium, all three mock exams, and
                            a Certificate of Participation.
                        </p>
                    </div>

                    {/* Recognition row */}
                    <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="rounded-xl bg-slate-50 p-4 md:p-5 text-center">
                            <Trophy className="w-6 h-6 md:w-7 md:h-7 text-amber-600 mx-auto mb-2" />
                            <p className="font-bold text-slate-900 text-sm md:text-base mb-1">
                                Cash Merit Awards
                            </p>
                            <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed">
                                Fixed prizes for the top three in both the
                                student and staff categories
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 md:p-5 text-center">
                            <Award className="w-6 h-6 md:w-7 md:h-7 text-blue-600 mx-auto mb-2" />
                            <p className="font-bold text-slate-900 text-sm md:text-base mb-1">
                                Nightingale Trophy
                            </p>
                            <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed">
                                Engraved and awarded at the online ceremony to
                                the national top three
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4 md:p-5 text-center">
                            <FileCheck2 className="w-6 h-6 md:w-7 md:h-7 text-emerald-600 mx-auto mb-2" />
                            <p className="font-bold text-slate-900 text-sm md:text-base mb-1">
                                Verifiable Certificates
                            </p>
                            <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed">
                                Participation, Merit, and Excellence
                                certificates recognised nationwide
                            </p>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0 mb-10 md:mb-12">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-white md:rounded-2xl p-5 md:p-6 md:border md:border-slate-100 md:shadow-sm md:hover:shadow-lg md:hover:-translate-y-1 transition-all duration-300 border-b border-slate-100 md:border-b-0"
                            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                        >
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 ${feature.bg}`}>
                                <feature.icon className={`w-5 h-5 md:w-6 md:h-6 ${feature.color}`} />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1.5 md:mb-2 text-sm md:text-base">{feature.title}</h4>
                            <p className="text-[11px] md:text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>

                {/* Who Can Join Section */}
                <div className="bg-white md:rounded-2xl p-5 md:p-8 md:shadow-sm md:border md:border-slate-100 mx-3 md:mx-0">
                    <div className="text-center mb-6 md:mb-8">
                        <h3 className="text-lg md:text-2xl font-black text-slate-900 mb-2">
                            Who Can Join
                        </h3>
                        <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto">
                            The Merit Cup is open to nursing students and
                            practising nurses across Kenya. Three categories,
                            each competing in their own ranking.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                        {categories.map((cat, i) => (
                            <div
                                key={i}
                                className="bg-slate-50 md:rounded-xl p-5 md:p-6 text-center border-b border-slate-100 md:border-b-0"
                            >
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${cat.bg} flex items-center justify-center mx-auto mb-3 md:mb-4`}>
                                    <cat.icon className={`w-6 h-6 md:w-7 md:h-7 ${cat.color}`} />
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm md:text-base mb-1">
                                    {cat.title}
                                </h4>
                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-blue-700 mb-2 md:mb-3">
                                    {cat.subtitle}
                                </p>
                                <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed">
                                    {cat.description}
                                </p>
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-[11px] md:text-xs text-slate-500 mt-5 md:mt-6 font-medium">
                        A limited number of slots are reserved for each Cup ·
                        Two Cups run every year
                    </p>
                </div>

                {/* Why It Matters — Wellness & Support */}
                <div className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-3 md:px-0">
                    <div className="bg-white md:rounded-2xl p-6 md:p-8 md:shadow-sm md:border md:border-slate-100">
                        <div className="flex items-center gap-3 mb-3 md:mb-4">
                            <div className="bg-rose-50 rounded-xl p-2.5 md:p-3">
                                <HeartPulse className="w-5 h-5 md:w-6 md:h-6 text-rose-600" />
                            </div>
                            <h3 className="text-base md:text-lg font-black text-slate-900">
                                Student Wellness
                            </h3>
                        </div>
                        <p className="text-[12px] md:text-sm text-slate-600 leading-relaxed">
                            Nursing school in Kenya is demanding. The Merit Cup
                            brings students into a shared academic community —
                            with daily wellness check-ins, peer support, and a
                            shared rhythm of study that reduces burnout.
                        </p>
                    </div>

                    <div className="bg-white md:rounded-2xl p-6 md:p-8 md:shadow-sm md:border md:border-slate-100">
                        <div className="flex items-center gap-3 mb-3 md:mb-4">
                            <div className="bg-blue-50 rounded-xl p-2.5 md:p-3">
                                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                            </div>
                            <h3 className="text-base md:text-lg font-black text-slate-900">
                                Beyond the Exam
                            </h3>
                        </div>
                        <p className="text-[12px] md:text-sm text-slate-600 leading-relaxed">
                            Medrae is building long-term support for nursing
                            students — including mentorship pathways,
                            connections to opportunities, and resources that
                            keep talented nurses in the profession.
                        </p>
                    </div>
                </div>

                {/* Final CTA — light card, no gradient, no dark */}
                <div className="mt-10 md:mt-12 mx-3 md:mx-0">
                    <div className="bg-white md:rounded-2xl p-6 md:p-10 shadow-sm border border-slate-100">
                        <div className="max-w-2xl mx-auto text-center">
                            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 md:mb-5">
                                <Users className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                Join Medrae to Participate
                            </div>
                            <h3 className="text-xl md:text-3xl font-black text-slate-900 mb-3 md:mb-4">
                                Ready to Be Part of the Merit Cup?
                            </h3>
                            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5 md:mb-6">
                                Create your free Medrae account to explore the
                                platform, start practising daily, and be
                                notified when registration opens for the next
                                Merit Cup. Every Medrae member is automatically
                                eligible to enter.
                            </p>

                            {/* What you unlock by joining Medrae */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8 text-left">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 mb-2" />
                                    <p className="font-bold text-slate-900 text-[12px] md:text-sm mb-1">
                                        Full Curriculum Access
                                    </p>
                                    <p className="text-[10px] md:text-xs text-slate-600 leading-relaxed">
                                        All 3 years, 80+ modules, and 1,000+
                                        units — from Year 1 to licensure
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 mb-2" />
                                    <p className="font-bold text-slate-900 text-[12px] md:text-sm mb-1">
                                        NCK-Style Practice
                                    </p>
                                    <p className="text-[10px] md:text-xs text-slate-600 leading-relaxed">
                                        Thousands of questions with rationales,
                                        flashcards, and DigiProctor simulations
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 mb-2" />
                                    <p className="font-bold text-slate-900 text-[12px] md:text-sm mb-1">
                                        Priority Merit Cup Access
                                    </p>
                                    <p className="text-[10px] md:text-xs text-slate-600 leading-relaxed">
                                        Get notified first and secure your slot
                                        before the Cup fills up
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    onClick={() => navigate('/register')}
                                    className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 md:py-3.5 px-6 md:px-8 rounded-xl shadow-sm transition-all text-sm md:text-base"
                                >
                                    Join Medrae Free
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                <Button
                                    onClick={() => navigate('/nursing')}
                                    variant="outline"
                                    className="bg-white text-blue-700 border-2 border-blue-200 hover:border-blue-700 hover:bg-blue-50 font-bold py-3 md:py-3.5 px-6 md:px-8 rounded-xl transition-all text-sm md:text-base"
                                >
                                    Explore the Platform
                                </Button>
                            </div>

                            <p className="text-[10px] md:text-xs text-slate-500 mt-4 md:mt-5">
                                Free to join · No credit card required ·
                                Available on mobile and desktop
                            </p>
                        </div>
                    </div>
                </div>

                {/* Closing quote — soft, no testimonial pressure */}
                <div className="mt-10 md:mt-12 mx-auto text-center px-4 md:px-0 max-w-2xl">
                    <div className="inline-flex items-center justify-center bg-blue-50 rounded-full p-3 mb-3">
                        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <p className="text-sm md:text-base text-slate-600 font-medium italic leading-relaxed">
                        &ldquo;The Merit Cup is more than a competition. It is
                        our commitment to recognising nursing excellence in
                        Kenya — rewarding study, skill, and merit in the spirit
                        of Florence Nightingale.&rdquo;
                    </p>
                    <p className="text-xs md:text-sm font-bold text-slate-800 mt-3">
                        — Medrae Nursing Leadership
                    </p>
                </div>
            </div>
        </section>
    );
};

export default NursingMeritCupSection;