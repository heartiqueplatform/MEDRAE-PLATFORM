import React from "react";
import { useNavigate } from "react-router-dom";
import {
    BookOpen,
    GraduationCap,
    Stethoscope,
    Layers,
    ArrowRight,
    Brain,
    FileText,
    Video,
    HelpCircle,
    Sparkles,
    Target,
    Medal,
    ChevronRight,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
            threshold: 0.2,
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

// ============================================================
// ANIMATION UTILITY: Counter animation with easing
// ============================================================
const useCountUp = (target: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    const [ref, isVisible] = useIntersectionObserver();

    useEffect(() => {
        if (!isVisible) return;

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setCount(Math.floor(eased * target));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isVisible, target, duration]);

    return [ref, count];
};

const KRCHNCurriculum = () => {
    const navigate = useNavigate();

    const [yearsRef, yearsCount] = useCountUp(3, 1500);
    const [modulesRef, modulesCount] = useCountUp(80, 2000);
    const [topicsRef, topicsCount] = useCountUp(1064, 2200);
    const [questionsRef, questionsCount] = useCountUp(15400, 2500);

    return (
        <section
            id="curriculum"
            className="py-12 md:py-24 px-0 md:px-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 font-sans antialiased">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10 md:mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-4 md:px-0">
                    <div className="inline-flex items-center gap-1.5 md:gap-2 bg-emerald-100 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-emerald-200 mb-4 md:mb-6 hover:scale-105 transition-transform">
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 animate-pulse" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-700">
                            New: Full KRCHN Curriculum
                        </span>
                    </div>

                    <h2 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tighter text-slate-900 mb-3 md:mb-4">
                        Complete{" "}
                        <span className="text-emerald-600 italic">KRCHN Nursing</span>{" "}
                        Curriculum
                    </h2>
                    <p className="text-sm md:text-lg text-slate-600 md:max-w-full md:px-4 lg:px-6 mx-auto font-medium">
                        Study the entire Kenya Registered Community Health Nursing syllabus
                        organized by Year, Semester, Module, Unit, and Topic. Every question,
                        note, and video mapped to the official NCK curriculum.
                    </p>
                </div>

                {/* Stats Cards with Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-10 md:mb-16 px-3 md:px-0">
                    {[
                        {
                            icon: GraduationCap,
                            value: 3,
                            label: "Academic Years",
                            color: "text-blue-600",
                            bg: "bg-blue-50",
                            delay: "0",
                            ref: yearsRef,
                            count: yearsCount,
                            suffix: ""
                        },
                        {
                            icon: Layers,
                            value: 80,
                            label: "Modules",
                            color: "text-emerald-600",
                            bg: "bg-emerald-50",
                            delay: "100",
                            ref: modulesRef,
                            count: modulesCount,
                            suffix: ""
                        },
                        {
                            icon: Target,
                            value: 1064,
                            label: "Topics & Subtopics",
                            color: "text-purple-600",
                            bg: "bg-purple-50",
                            delay: "200",
                            ref: topicsRef,
                            count: topicsCount,
                            suffix: "+"
                        },
                        {
                            icon: Medal,
                            value: 15400,
                            label: "Revision Questions",
                            color: "text-amber-600",
                            bg: "bg-amber-50",
                            delay: "300",
                            ref: questionsRef,
                            count: questionsCount,
                            suffix: "+"
                        },
                    ].map((stat, i) => (
                        <div
                            key={i}
                            ref={stat.ref}
                            className={`${stat.bg} md:rounded-2xl p-3 md:p-6 text-center md:border md:border-slate-100 md:hover:shadow-lg md:hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 border-b border-slate-100 md:border-b md:border-slate-100`}
                            style={{ animationDelay: `${stat.delay}ms`, animationFillMode: 'both' }}
                        >
                            <stat.icon className={`w-6 h-6 md:w-10 md:h-10 mx-auto mb-1.5 md:mb-3 ${stat.color}`} />
                            <p className={`text-2xl md:text-4xl font-black ${stat.color} tabular-nums transition-all duration-200`}>
                                {stat.count.toLocaleString()}{stat.suffix}
                            </p>
                            <p className="text-[10px] md:text-sm font-semibold text-slate-600 mt-0.5 md:mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Year Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-12 px-3 md:px-0">
                    {/* Year 1 */}
                    <div className="md:border-0 bg-white md:rounded-2xl md:shadow-lg md:hover:shadow-2xl md:hover:-translate-y-2 transition-all duration-500 overflow-hidden animate-in fade-in slide-in-from-left-8 border-b border-slate-100 md:border-b-0" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 md:p-6 text-white">
                            <div className="flex items-center justify-between mb-2 md:mb-3">
                                <span className="text-4xl md:text-5xl font-black opacity-30">01</span>
                                <GraduationCap className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black">Year 1</h3>
                            <p className="text-emerald-50 text-xs md:text-sm mt-0.5 md:mt-1">Foundation Nursing</p>
                        </div>
                        <div className="p-4 md:p-5 space-y-2 md:space-y-3">
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="font-semibold text-slate-700">Semesters</span>
                                <span className="text-emerald-600 font-bold">2</span>
                            </div>
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="font-semibold text-slate-700">Modules</span>
                                <span className="text-emerald-600 font-bold">18 + 22</span>
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-500 leading-relaxed pt-1.5 md:pt-2 border-t">
                                Communication, Anatomy & Physiology, Fundamentals of Nursing I & II,
                                Microbiology, Psychology, Maternal & Newborn Health, Community Health,
                                Pharmacology I, Medical-Surgical Nursing, and clinical practicums.
                            </div>
                            <Button
                                className="w-full mt-2 md:mt-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-2.5 md:py-3 rounded-xl shadow-md shadow-emerald-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group text-xs md:text-sm"
                                onClick={() => navigate("/register")}
                            >
                                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 group-hover:animate-pulse" />
                                Start Year 1
                                <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 md:ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </div>

                    {/* Year 2 */}
                    <div className="md:border-0 bg-white md:rounded-2xl md:shadow-lg md:hover:shadow-2xl md:hover:-translate-y-2 transition-all duration-500 overflow-hidden animate-in fade-in slide-in-from-bottom-8 border-b border-slate-100 md:border-b-0" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-5 md:p-6 text-white">
                            <div className="flex items-center justify-between mb-2 md:mb-3">
                                <span className="text-4xl md:text-5xl font-black opacity-30">02</span>
                                <Stethoscope className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black">Year 2</h3>
                            <p className="text-blue-50 text-xs md:text-sm mt-0.5 md:mt-1">Clinical Nursing</p>
                        </div>
                        <div className="p-4 md:p-5 space-y-2 md:space-y-3">
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="font-semibold text-slate-700">Semesters</span>
                                <span className="text-blue-600 font-bold">2</span>
                            </div>
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="font-semibold text-slate-700">Modules</span>
                                <span className="text-blue-600 font-bold">13 + 11</span>
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-500 leading-relaxed pt-1.5 md:pt-2 border-t">
                                Pharmacology II, Pediatric Nursing & IMCI, Mental & Psychiatric Health,
                                Orthopedic, Endocrinological, ENT, Ophthalmic, Perioperative,
                                Palliative Care, Gynaecology, Research, Community Strategy.
                            </div>
                            <Button
                                className="w-full mt-2 md:mt-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2.5 md:py-3 rounded-xl shadow-md shadow-blue-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group text-xs md:text-sm"
                                onClick={() => navigate("/register")}
                            >
                                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 group-hover:animate-pulse" />
                                Start Year 2
                                <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 md:ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </div>

                    {/* Year 3 */}
                    <div className="md:border-0 bg-white md:rounded-2xl md:shadow-lg md:hover:shadow-2xl md:hover:-translate-y-2 transition-all duration-500 overflow-hidden animate-in fade-in slide-in-from-right-8" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-5 md:p-6 text-white">
                            <div className="flex items-center justify-between mb-2 md:mb-3">
                                <span className="text-4xl md:text-5xl font-black opacity-30">03</span>
                                <Brain className="w-8 h-8 md:w-10 md:h-10 opacity-80" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black">Year 3</h3>
                            <p className="text-purple-50 text-xs md:text-sm mt-0.5 md:mt-1">Advanced & Clinical Practice</p>
                        </div>
                        <div className="p-4 md:p-5 space-y-2 md:space-y-3">
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="font-semibold text-slate-700">Semesters</span>
                                <span className="text-purple-600 font-bold">2</span>
                            </div>
                            <div className="flex items-center justify-between text-xs md:text-sm">
                                <span className="font-semibold text-slate-700">Modules</span>
                                <span className="text-purple-600 font-bold">9 + 7 Clinical</span>
                            </div>
                            <div className="text-[10px] md:text-xs text-slate-500 leading-relaxed pt-1.5 md:pt-2 border-t">
                                Teaching Methodology, Neurological, Dermatological, Gerontological
                                Nursing, Epidemiology, Communicable Diseases, Health Systems
                                Management, and intensive clinical practicums.
                            </div>
                            <Button
                                className="w-full mt-2 md:mt-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-2.5 md:py-3 rounded-xl shadow-md shadow-purple-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group text-xs md:text-sm"
                                onClick={() => navigate("/register")}
                            >
                                <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2 group-hover:animate-pulse" />
                                Start Year 3
                                <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 md:ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* What's Included */}
                <div className="md:bg-white md:rounded-2xl p-5 md:p-8 md:shadow-lg md:border md:border-slate-100 animate-in fade-in slide-in-from-bottom-8 mx-3 md:mx-0" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 mb-4 md:mb-6 text-center">
                        Everything Included in the Curriculum
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {[
                            {
                                icon: HelpCircle,
                                title: "15,400+ Questions",
                                desc: "NCK-style MCQs with detailed explanations, mnemonics, clinical pearls, and simplified explanations for every topic.",
                                color: "text-amber-600",
                                bg: "bg-amber-50",
                            },
                            {
                                icon: FileText,
                                title: "Study Notes",
                                desc: "Comprehensive notes for every module unit covering key concepts, nursing interventions, and exam tips.",
                                color: "text-blue-600",
                                bg: "bg-blue-50",
                            },
                            {
                                icon: Video,
                                title: "Curated YouTube Videos",
                                desc: "3,000+ nursing education videos with no ads, organized by topic for distraction-free learning.",
                                color: "text-red-600",
                                bg: "bg-red-50",
                            },
                            {
                                icon: Sparkles,
                                title: "AI-Powered Learning",
                                desc: "Smart algorithm predicts your NCK readiness, identifies weak areas, and recommends focused practice.",
                                color: "text-purple-600",
                                bg: "bg-purple-50",
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className={`${item.bg} md:rounded-xl p-4 md:p-5 md:border md:border-slate-100 md:hover:shadow-md md:hover:-translate-y-1 transition-all duration-300 border-b border-slate-100 md:border-b md:border-slate-100`}
                            >
                                <item.icon className={`w-6 h-6 md:w-8 md:h-8 ${item.color} mb-2 md:mb-3`} />
                                <h4 className="font-bold text-slate-900 mb-1.5 md:mb-2 text-sm md:text-base">{item.title}</h4>
                                <p className="text-[10px] md:text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-10 md:mt-12 animate-in fade-in slide-in-from-bottom-8 px-4 md:px-0" style={{ animationDelay: '1000ms', animationFillMode: 'both' }}>
                    <Button
                        size="lg"
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base md:text-lg px-8 md:px-10 py-5 md:py-6 rounded-2xl shadow-xl shadow-emerald-200 hover:shadow-2xl hover:scale-105 transition-all duration-300 group w-full md:w-auto"
                        onClick={() => navigate("/register")}
                    >
                        <BookOpen className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2 group-hover:animate-bounce" />
                        Join Medrae & Start Learning
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-1.5 md:ml-2 transition-transform group-hover:translate-x-2" />
                    </Button>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-2 md:mt-3 font-medium">
                        Follows the official Nursing Council of Kenya (NCK) KRCHN syllabus
                    </p>
                </div>
            </div>
        </section>
    );
};

export default KRCHNCurriculum;