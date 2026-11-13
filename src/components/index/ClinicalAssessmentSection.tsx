// src/components/index/ClinicalAssessmentSection.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain, Clock, Award, Target, Shield, ArrowRight, CheckCircle,
    Play, TrendingUp, Users, Star, GraduationCap, ClipboardCheck,
    Stethoscope, Activity, UserCheck, MessageSquare,
} from "lucide-react";

/* ── Scroll reveal ── */
const useIntersectionObserver = (options = {}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px", ...options });
        if (ref.current) observer.observe(ref.current);
        return () => { if (ref.current) observer.unobserve(ref.current); };
    }, [options]);
    return [ref, isVisible];
};

/* ── Counter animation ── */
const useCountUp = (target: number, duration = 2000) => {
    const [count, setCount] = useState(0);
    const [ref, isVisible] = useIntersectionObserver();
    useEffect(() => {
        if (!isVisible) return;
        let startTime: number;
        let animationFrame: number;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isVisible, target, duration]);
    return [ref, count];
};

export default function ClinicalAssessmentSection() {
    const navigate = useNavigate();
    const [assessmentsRef, assessmentsCount] = useCountUp(24, 1500);
    const [stepsRef, stepsCount] = useCountUp(200, 1800);
    const [usersRef, usersCount] = useCountUp(2231, 2000);
    const [avgScoreRef, avgScoreCount] = useCountUp(78, 1600);

    const features = [
        { icon: Brain, color: "text-blue-600", title: "Clinical assessment suite", description: "Real clinical scenarios with AI-powered nursing tutor feedback. Test clinical reasoning, patient safety, and decision-making." },
        { icon: MessageSquare, color: "text-purple-600", title: "AI nursing tutor", description: "Instant feedback with detailed explanations, missing keyword identification, and clinical references." },
        { icon: Shield, color: "text-emerald-600", title: "Patient safety focus", description: "Every scenario emphasizes patient safety, clinical judgment, and evidence-based practice." },
        { icon: Award, color: "text-amber-600", title: "Performance tracking", description: "Monitor scores, identify weak areas, and watch your clinical reasoning improve over time." },
        { icon: Target, color: "text-rose-600", title: "NCK-style questions", description: "Practice with questions that mirror the NCK exam format — build familiarity with what you'll face." },
        { icon: Clock, color: "text-indigo-600", title: "Timed practice mode", description: "Simulate exam conditions with timed assessments. Learn to manage your time while maintaining accuracy." },
    ];

    const assessmentTypes = [
        { icon: ClipboardCheck, color: "text-blue-600", title: "Clinical scenarios" },
        { icon: Stethoscope, color: "text-purple-600", title: "Critical thinking" },
        { icon: Activity, color: "text-emerald-600", title: "Patient assessment" },
        { icon: UserCheck, color: "text-amber-600", title: "Patient safety" },
    ];

    return (
        <section id="clinical-assessment" className="py-10 md:py-14 px-4 md:px-6 bg-white">
            <div className="max-w-6xl mx-auto">

                {/* ── HEADER ── */}
                <div className="text-center mb-10 md:mb-14">
                    <h2 className="text-[26px] md:text-4xl lg:text-[44px] font-bold tracking-tighter text-slate-900 leading-tight">
                        Clinical <span className="text-blue-600 italic">Assessment</span> Practice
                    </h2>
                    <p className="mt-2.5 text-[14px] md:text-[15px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        Test your clinical knowledge with real-world scenarios. Get instant AI-powered
                        feedback, track your progress, and build confidence for your NCK exam.
                    </p>
                </div>

                {/* ── EDITORIAL HERO (2 columns, no cards) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 mb-12 md:mb-16 items-start">

                    {/* LEFT — narrative + CTA */}
                    <div>
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                            Start your clinical{" "}
                            <span className="text-blue-600">assessment journey.</span>
                        </h3>

                        <p className="mt-4 text-[14px] md:text-[15px] text-slate-600 leading-relaxed max-w-md">
                            Practice real clinical scenarios with instant AI tutor feedback.
                            Build clinical reasoning skills that stick — from the exam room
                            to the ward.
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => navigate("/register")}
                                className="inline-flex items-center justify-center gap-2
                                           px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700
                                           text-white font-bold text-[13px]
                                           hover:scale-[1.02] active:scale-[0.97]
                                           transition-all duration-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                <Play className="w-4 h-4" fill="currentColor" />
                                Start practicing
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate("/assessments")}
                                className="inline-flex items-center justify-center gap-2
                                           px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200
                                           text-slate-700 font-bold text-[13px]
                                           hover:scale-[1.02] active:scale-[0.97]
                                           transition-all duration-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                Browse assessments
                            </button>
                        </div>

                        <ul className="mt-6 space-y-2">
                            {[
                                "Instant feedback on every answer",
                                "Patient-safety focused scenarios",
                                "NCK-aligned question formats",
                            ].map((point, i) => (
                                <li key={i} className="flex items-center gap-2 text-[12.5px] text-slate-600">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* RIGHT — big stat block, no card chrome */}
                    <div className="lg:pl-8 lg:border-l border-slate-200/70 pt-6 lg:pt-0
                                    border-t lg:border-t-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                            The Medrae library
                        </p>

                        <div className="flex items-baseline gap-1.5 mb-1">
                            <p ref={assessmentsRef} className="text-[64px] md:text-[80px] font-bold text-slate-900 tabular-nums leading-none tracking-tighter">
                                {assessmentsCount}
                            </p>
                            <span className="text-[28px] md:text-[36px] font-bold text-blue-600 leading-none">+</span>
                        </div>
                        <p className="text-[13px] text-slate-500 mb-6">
                            clinical assessment scenarios, ready to practice.
                        </p>

                        <div className="space-y-3">
                            <div ref={stepsRef} className="flex items-baseline justify-between">
                                <span className="text-[12px] font-semibold text-slate-500">Practice questions</span>
                                <span className="text-[15px] font-bold text-slate-900 tabular-nums">
                                    {stepsCount.toLocaleString()}+
                                </span>
                            </div>
                            <div ref={usersRef} className="flex items-baseline justify-between">
                                <span className="text-[12px] font-semibold text-slate-500">Active nursing students</span>
                                <span className="text-[15px] font-bold text-slate-900 tabular-nums">
                                    {usersCount.toLocaleString()}+
                                </span>
                            </div>
                            <div ref={avgScoreRef} className="flex items-baseline justify-between">
                                <span className="text-[12px] font-semibold text-slate-500">Average score</span>
                                <span className="text-[15px] font-bold text-emerald-600 tabular-nums">
                                    {avgScoreCount}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── FEATURE LIST (2-column paragraph layout, no cards) ── */}
                <div className="mb-12 md:mb-16">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
                        Everything you get
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                        {features.map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="flex gap-3">
                                    <Icon className={`w-5 h-5 ${feature.color} shrink-0 mt-0.5`} strokeWidth={2.2} />
                                    <div className="min-w-0">
                                        <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                                            {feature.title}
                                        </p>
                                        <p className="text-[12.5px] text-slate-500 leading-relaxed mt-1">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── WHAT YOU'LL PRACTICE (inline, no containers) ── */}
                <div className="mb-12 md:mb-16 py-8 border-y border-slate-200/70">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5">
                        What you'll practice
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {assessmentTypes.map((type, i) => {
                            const Icon = type.icon;
                            return (
                                <div key={i}>
                                    <Icon className={`w-5 h-5 ${type.color} mb-2`} strokeWidth={2.2} />
                                    <p className="text-[13px] font-bold text-slate-900 leading-tight">
                                        {type.title}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── TESTIMONIAL (quiet, no card) ── */}
                <div className="max-w-2xl mx-auto text-center">
                    <div className="flex justify-center gap-0.5 mb-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ))}
                    </div>
                    <p className="text-[15px] md:text-[17px] text-slate-700 font-medium italic leading-relaxed">
                        "The clinical assessments transformed how I prepare. The instant AI feedback
                        shows exactly where I need to improve — I feel so much more confident now."
                    </p>
                    <p className="text-[12px] font-bold text-slate-800 mt-3">
                        — Mary W., Nursing Student
                    </p>
                </div>
            </div>
        </section>
    );
}