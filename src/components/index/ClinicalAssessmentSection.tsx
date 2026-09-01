import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Brain,
    BarChart3,
    Clock,
    Award,
    Target,
    FileText,
    MessageSquare,
    Shield,
    Sparkles,
    ArrowRight,
    CheckCircle,
    Play,
    BookOpen,
    TrendingUp,
    Users,
    Calendar,
    Star,
    Zap,
    ChevronRight,
    Heart,
    AlertCircle,
    ThumbsUp,
    GraduationCap,
    ClipboardCheck,
    Microscope,
    Stethoscope,
    Activity,
    UserCheck,
    Timer,
    Layers,
    Medal,
    Gauge,
    Eye,
    BookOpenCheck
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

// ============================================================
// COUNTER ANIMATION
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
            const eased = 1 - Math.pow(1 - progress, 3);
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

const ClinicalAssessmentSection = () => {
    const navigate = useNavigate();

    // Stats counters
    const [assessmentsRef, assessmentsCount] = useCountUp(24, 1500);
    const [stepsRef, stepsCount] = useCountUp(200, 1800);
    const [usersRef, usersCount] = useCountUp(2231, 2000);
    const [avgScoreRef, avgScoreCount] = useCountUp(78, 1600);

    const features = [
        {
            icon: Brain,
            title: "Clinical Assessment Suite",
            description: "Practice real clinical scenarios with AI-powered nursing tutor feedback. Each assessment is designed to test your clinical reasoning, patient safety, and decision-making skills.",
            color: "text-blue-600",
            bg: "bg-blue-50",
            highlight: true
        },
        {
            icon: MessageSquare,
            title: "AI Nursing Tutor",
            description: "Get instant feedback on your answers with detailed explanations, missing keywords identification, and clinical references. Learn from your mistakes in real-time.",
            color: "text-purple-600",
            bg: "bg-purple-50",
            highlight: false
        },
        {
            icon: Shield,
            title: "Patient Safety Focus",
            description: "Every scenario emphasizes patient safety, clinical judgment, and evidence-based practice. Build confidence in making critical nursing decisions.",
            color: "text-green-600",
            bg: "bg-green-50",
            highlight: false
        },
        {
            icon: Award,
            title: "Performance Tracking",
            description: "Track your progress across multiple assessments. Monitor your scores, identify weak areas, and watch your clinical reasoning skills improve over time.",
            color: "text-amber-600",
            bg: "bg-amber-50",
            highlight: false
        },
        {
            icon: Target,
            title: "NCK-Style Questions",
            description: "Practice with questions that mirror the NCK exam format. Build familiarity with the question styles you'll encounter on your licensing exam.",
            color: "text-rose-600",
            bg: "bg-rose-50",
            highlight: false
        },
        {
            icon: Clock,
            title: "Timed Practice Mode",
            description: "Simulate exam conditions with timed assessments. Learn to manage your time effectively while maintaining accuracy and clinical precision.",
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            highlight: false
        }
    ];

    const assessmentTypes = [
        {
            icon: ClipboardCheck,
            title: "Clinical Scenarios",
            description: "Realistic patient cases with detailed clinical contexts. Apply your nursing knowledge to solve complex problems.",
            color: "text-blue-500"
        },
        {
            icon: Stethoscope,
            title: "Critical Thinking",
            description: "Questions designed to test your clinical judgment, prioritization, and decision-making in high-pressure situations.",
            color: "text-purple-500"
        },
        {
            icon: Activity,
            title: "Patient Assessment",
            description: "Practice comprehensive patient assessments. Learn to identify key findings and determine appropriate interventions.",
            color: "text-green-500"
        },
        {
            icon: UserCheck,
            title: "Patient Safety",
            description: "Focus on safety protocols, medication administration, infection control, and fall prevention strategies.",
            color: "text-amber-500"
        }
    ];

    const stats = [
        { value: assessmentsCount, suffix: "+", label: "Clinical Assessments", icon: BookOpen, color: "text-blue-600", ref: assessmentsRef },
        { value: stepsCount, suffix: "+", label: "Practice Questions", icon: FileText, color: "text-purple-600", ref: stepsRef },
        { value: usersCount, suffix: "+", label: "Nursing Students", icon: Users, color: "text-green-600", ref: usersRef },
        { value: avgScoreCount, suffix: "%", label: "Average Score", icon: TrendingUp, color: "text-amber-600", ref: avgScoreRef },
    ];

    return (
        <section className="py-12 md:py-20 px-0 md:px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans antialiased">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10 md:mb-16 px-4 md:px-0">
                    <div className="inline-flex items-center gap-2 bg-blue-100 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-blue-200 mb-4 md:mb-6 hover:scale-105 transition-transform">
                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 animate-pulse" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-700">
                            New: Clinical Assessment Module
                        </span>
                    </div>

                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-900 mb-3 md:mb-4">
                        Clinical{" "}
                        <span className="text-blue-600 italic">Assessment</span>{" "}
                        Practice
                    </h2>
                    <p className="text-sm md:text-lg text-slate-600 md:max-w-full md:px-4 lg:px-6 mx-auto font-medium">
                        Test your clinical knowledge with real-world scenarios. Get instant AI-powered feedback,
                        track your progress, and build confidence for your NCK exam.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-10 md:mb-16 px-3 md:px-0">
                    {stats.map((stat, i) => (
                        <div
                            key={i}
                            ref={stat.ref}
                            className="bg-white md:rounded-2xl p-3 md:p-6 text-center md:border md:border-slate-100 md:shadow-sm md:hover:shadow-lg md:hover:-translate-y-1 transition-all duration-300 border-b border-slate-100 md:border-b-0"
                            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                        >
                            <stat.icon className={`w-5 h-5 md:w-8 md:h-8 mx-auto mb-1.5 md:mb-3 ${stat.color}`} />
                            <p className={`text-xl md:text-3xl font-black ${stat.color} tabular-nums`}>
                                {stat.value.toLocaleString()}{stat.suffix}
                            </p>
                            <p className="text-[10px] md:text-sm font-semibold text-slate-600 mt-0.5 md:mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Main Assessment Card - Hero */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl md:rounded-3xl p-6 md:p-10 mb-10 md:mb-12 mx-3 md:mx-0 shadow-xl shadow-blue-200/50 hover:shadow-2xl transition-all duration-500">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                        <div className="text-white space-y-3 md:space-y-4">
                            <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 md:w-6 md:h-6 text-blue-200 animate-pulse" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-200">
                                    AI-Powered Clinical Practice
                                </span>
                            </div>
                            <h3 className="text-2xl md:text-4xl font-black leading-tight">
                                Start Your Clinical <br />
                                <span className="text-blue-200">Assessment Journey</span>
                            </h3>
                            <p className="text-blue-100 text-sm md:text-base max-w-md leading-relaxed">
                                Practice real clinical scenarios with instant AI tutor feedback.
                                Build clinical reasoning skills for your nursing career.
                            </p>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <Button
                                    onClick={() => navigate('/register')}
                                    className="bg-white text-blue-700 hover:bg-blue-50 font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-sm md:text-base"
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    Start Practicing
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/register')}
                                    className="border-white/30 text-white hover:bg-white/20 font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-xl transition-all hover:scale-105 text-sm md:text-base"
                                >
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    View Your Progress
                                </Button>
                            </div>
                        </div>
                        <div className="flex-shrink-0 hidden md:block">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="bg-white/20 rounded-full p-2">
                                        <GraduationCap className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-blue-200">Assessment Ready</p>
                                        <p className="text-2xl font-black">{assessmentsCount}+</p>
                                        <p className="text-xs text-blue-200">Practice Scenarios</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2 text-xs text-blue-200">
                                    <CheckCircle className="w-4 h-4 text-green-300" />
                                    <span>Instant feedback on every answer</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-blue-200">
                                    <Shield className="w-4 h-4 text-green-300" />
                                    <span>Patient safety focused scenarios</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0 mb-10 md:mb-12">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`bg-white md:rounded-2xl p-5 md:p-6 md:border md:border-slate-100 md:shadow-sm md:hover:shadow-lg md:hover:-translate-y-1 transition-all duration-300 border-b border-slate-100 md:border-b-0 ${feature.highlight ? 'md:ring-2 md:ring-blue-400/30' : ''}`}
                            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                        >
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 ${feature.bg}`}>
                                <feature.icon className={`w-5 h-5 md:w-6 md:h-6 ${feature.color}`} />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-1.5 md:mb-2 text-sm md:text-base">{feature.title}</h4>
                            <p className="text-[11px] md:text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                            {feature.highlight && (
                                <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider">
                                    <Sparkles className="w-3 h-3" />
                                    AI Powered
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Assessment Types Section */}
                <div className="bg-white md:rounded-2xl p-5 md:p-8 md:shadow-sm md:border md:border-slate-100 mx-3 md:mx-0">
                    <h3 className="text-lg md:text-xl font-black text-slate-900 mb-4 md:mb-6 text-center">
                        What You'll Practice
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {assessmentTypes.map((type, i) => (
                            <div
                                key={i}
                                className="bg-slate-50 md:rounded-xl p-4 md:p-5 md:hover:shadow-md transition-all duration-300 border-b border-slate-100 md:border-b-0"
                            >
                                <type.icon className={`w-5 h-5 md:w-6 md:h-6 ${type.color} mb-2 md:mb-3`} />
                                <h4 className="font-bold text-slate-900 text-sm md:text-base mb-1">{type.title}</h4>
                                <p className="text-[10px] md:text-xs text-slate-600 leading-relaxed">{type.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Testimonial */}
                <div className="mt-10 md:mt-12 md:max-w-full md:px-4 lg:px-6 mx-auto text-center px-4 md:px-0">
                    <div className="bg-white md:rounded-2xl p-5 md:p-8 md:shadow-sm md:border md:border-slate-100">
                        <div className="flex justify-center mb-3">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                                        <img src={`https://i.pravatar.cc/100?img=${i + 30}`} alt="user" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-sm md:text-base text-slate-600 font-medium italic leading-relaxed">
                            "The clinical assessments have transformed how I prepare for exams. The instant AI feedback
                            helps me understand exactly where I need to improve. I feel so much more confident now!"
                        </p>
                        <p className="text-xs md:text-sm font-bold text-slate-800 mt-3">— Mary W., Nursing Student</p>
                        <div className="flex justify-center mt-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className="w-3 h-3 md:w-4 md:h-4 text-yellow-400 fill-yellow-400" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-10 md:mt-12 px-4 md:px-0">
                    <Button
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-base md:text-lg px-8 md:px-10 py-5 md:py-6 rounded-2xl shadow-xl shadow-blue-200 hover:shadow-2xl hover:scale-105 transition-all duration-300 group w-full md:w-auto"
                        onClick={() => navigate("/register")}
                    >
                        <Zap className="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:animate-pulse" />
                        Start Your Clinical Assessment Journey
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 transition-transform group-hover:translate-x-2" />
                    </Button>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-3 font-medium">
                        Free for Medrae students • 24 clinical assessments available
                    </p>
                </div>
            </div>
        </section>
    );
};

export default ClinicalAssessmentSection;