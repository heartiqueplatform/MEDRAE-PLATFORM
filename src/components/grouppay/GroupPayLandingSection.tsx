// src/components/grouppay/GroupPayLandingSection.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Wallet,
    GraduationCap,
    TrendingUp,
    ArrowRight,
    CheckCircle,
    Sparkles,
    Shield,
    Clock,
    BookOpen,
    Star,
    Zap,
    ChevronRight,
    Heart,
    ThumbsUp,
    Medal,
    Gauge,
    Eye,
    UserPlus,
    Calendar,
    DollarSign,
    PiggyBank,
    Target,
    Crown,
    Smartphone,
    Copy,
    Gift,
    Rocket,
    Award,
    Globe,
    Network,
    Briefcase,
    FileCheck,
    Headphones,
    Users2,
    Building,
    StarHalf,
    MessageCircle,
    Phone,
    Mail,
    MapPin,
    Clock as ClockIcon,
    LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
// ANIMATED SECTION WRAPPER - Matching main page theme
// ============================================================
const AnimatedSection = ({ children, className = "", delay = 0, direction = "up" }: any) => {
    const [ref, isVisible] = useIntersectionObserver();

    const getTransform = () => {
        switch (direction) {
            case 'up': return 'translateY(60px)';
            case 'down': return 'translateY(-60px)';
            case 'left': return 'translateX(-60px)';
            case 'right': return 'translateX(60px)';
            default: return 'translateY(60px)';
        }
    };

    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0'}`}
            style={{
                transform: isVisible ? 'translateY(0)' : getTransform(),
                transitionDelay: `${delay}ms`,
                ...(className ? { className } : {})
            }}
        >
            {children}
        </div>
    );
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

const GroupPayLandingSection = () => {
    const navigate = useNavigate();

    // Realistic stats
    const [groupsRef, groupsCount] = useCountUp(47, 1800);
    const [membersRef, membersCount] = useCountUp(523, 2000);
    const [savingsRef, savingsCount] = useCountUp(24500, 2200);
    const [schoolsRef, schoolsCount] = useCountUp(18, 1600);

    const features = [
        {
            icon: Wallet,
            title: "Save on Premium Access",
            description: "Instead of paying KSh 199 individually, contribute just KSh 99 per member when you join a group of 10+ students.",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            highlight: true,
            saving: "Save 50%"
        },
        {
            icon: Users2,
            title: "Study Together",
            description: "Form study groups with classmates and fellow nursing students. Collaborate, share resources, and motivate each other.",
            color: "text-blue-600",
            bg: "bg-blue-50",
            highlight: false,
            saving: null
        },
        {
            icon: Crown,
            title: "Premium for Everyone",
            description: "When the group pays, EVERY member gets instant premium access. No individual payments needed.",
            color: "text-amber-600",
            bg: "bg-amber-50",
            highlight: false,
            saving: null
        },
        {
            icon: Smartphone,
            title: "Simple M-Pesa Payments",
            description: "Group leaders pay via M-Pesa with just a few taps. All members get activated automatically.",
            color: "text-purple-600",
            bg: "bg-purple-50",
            highlight: false,
            saving: null
        },
        {
            icon: Network,
            title: "Build Your Network",
            description: "Connect with nursing students across Kenya. Share knowledge and grow together in your medical career.",
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            highlight: false,
            saving: null
        },
        {
            icon: Target,
            title: "Study Efficiently",
            description: "Group learning helps you stay motivated, cover more content, and prepare better for your exams.",
            color: "text-rose-600",
            bg: "bg-rose-50",
            highlight: false,
            saving: null
        }
    ];

    const pricingComparison = [
        {
            plan: "Individual Premium",
            price: "KSh 199",
            features: [
                "Full premium access",
                "Clinical assessments",
                "AI tutor feedback",
                "Progress tracking",
                "MedTube access",
                "Resources bank"
            ],
            icon: UserPlus,
            recommended: false
        },
        {
            plan: "GroupPay (10+ Members)",
            price: "KSh 99",
            features: [
                "Full premium access",
                "Clinical assessments",
                "AI tutor feedback",
                "Progress tracking",
                "MedTube access",
                "Resources bank",
                "Collaborative learning",
                "Group chat & support"
            ],
            icon: Users,
            recommended: true,
            savings: "Save KSh 100/member"
        }
    ];

    const stats = [
        {
            value: groupsCount,
            suffix: "+",
            label: "Active Study Groups",
            icon: Users,
            color: "text-emerald-600",
            ref: groupsRef
        },
        {
            value: membersCount,
            suffix: "+",
            label: "Students Saving Together",
            icon: GraduationCap,
            color: "text-blue-600",
            ref: membersRef
        },
        {
            value: savingsCount,
            suffix: "+",
            label: "KSh Saved Together",
            icon: PiggyBank,
            color: "text-amber-600",
            ref: savingsRef
        },
        {
            value: schoolsCount,
            suffix: "+",
            label: "Nursing Schools",
            icon: Building,
            color: "text-purple-600",
            ref: schoolsRef
        },
    ];

    const testimonials = [
        {
            name: "Mary Wanjiru",
            role: "Nursing Student, KMTC Embu",
            avatar: "https://i.pravatar.cc/100?img=1",
            quote: "GroupPay helps me save money while studying with my friends. We're 12 in our group and everyone gets premium access.",
            rating: 5
        },
        {
            name: "David Otieno",
            role: "Nursing Student, University of Nairobi",
            avatar: "https://i.pravatar.cc/100?img=2",
            quote: "Forming a group was easy. We have 15 members and everyone gets premium access instantly when we pay together.",
            rating: 5
        },
        {
            name: "Sarah Akinyi",
            role: "Clinical Medicine, Moi University",
            avatar: "https://i.pravatar.cc/100?img=3",
            quote: "The money I save with GroupPay goes to buying medical textbooks. It's a smart way for students to access premium content.",
            rating: 5
        }
    ];

    const benefits = [
        {
            icon: DollarSign,
            title: "Affordable Access",
            description: "Pay as low as KSh 99 per member"
        },
        {
            icon: BookOpen,
            title: "Premium Content",
            description: "Full access to all Medrae features"
        },
        {
            icon: Users,
            title: "Collaborative Learning",
            description: "Study and grow together as a group"
        },
        {
            icon: Sparkles,
            title: "Instant Activation",
            description: "Access immediately after payment"
        }
    ];

    const handleJoinClick = () => {
        navigate('/register');
    };

    return (
        <section
            id="grouppay"
            className="py-16 md:py-24 px-0 md:px-4 bg-white text-slate-900 overflow-hidden"
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <AnimatedSection direction="up">
                    <div className="text-center mb-12 md:mb-16 px-4 md:px-0">
                        <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-emerald-100 mb-4 md:mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-600">
                                Study Together, Save Together
                            </span>
                        </div>

                        <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tighter text-slate-800">
                            Study <span className="text-emerald-600">Together</span>.<br className="block sm:hidden" />
                            <span className="text-blue-600">Pay Together</span>.<br className="block sm:hidden" />
                            <span className="text-purple-600">Learn Together</span>.
                        </h2>
                        <p className="text-sm md:text-lg lg:text-xl text-slate-500 md:max-w-full md:px-4 lg:px-6 mx-auto mt-4 font-medium leading-relaxed">
                            Join a study group and get premium access for everyone at a fraction of the cost.
                            Save up to 50% on your monthly subscription while learning alongside fellow nursing students.
                        </p>
                    </div>
                </AnimatedSection>

                {/* Stats Cards */}
                <AnimatedSection direction="up" delay={100}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-12 md:mb-16 px-3 md:px-0">
                        {stats.map((stat, i) => (
                            <div
                                key={i}
                                ref={stat.ref}
                                className="bg-slate-50/50 hover:bg-white rounded-2xl p-4 md:p-6 text-center border border-slate-100 hover:border-emerald-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default"
                            >
                                <stat.icon className={`w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 ${stat.color}`} />
                                <p className={`text-2xl md:text-3xl lg:text-4xl font-black ${stat.color} tabular-nums`}>
                                    {stat.value.toLocaleString()}{stat.suffix}
                                </p>
                                <p className="text-[10px] md:text-sm font-semibold text-slate-600 mt-0.5 md:mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </AnimatedSection>

                {/* Main Hero Card */}
                <AnimatedSection direction="up" delay={150}>
                    <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 rounded-2xl md:rounded-3xl p-6 md:p-10 mb-12 md:mb-16 mx-3 md:mx-0 border border-slate-100 shadow-lg hover:shadow-xl transition-all duration-500">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                            <div className="space-y-4 md:space-y-5">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500">
                                        Smart Savings for Nursing Students
                                    </span>
                                </div>
                                <h3 className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight text-slate-800">
                                    Pay Less. <br />
                                    <span className="text-emerald-600">Learn More.</span>
                                </h3>
                                <p className="text-slate-600 text-sm md:text-base max-w-md leading-relaxed">
                                    Join a group of 10+ nursing students and pay just <span className="font-bold text-emerald-600">KSh 99</span> per member instead of <span className="line-through text-slate-400">KSh 199</span>.
                                    That's <span className="font-bold text-emerald-600">KSh 100 saved</span> every month!
                                </p>
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <Button
                                        onClick={handleJoinClick}
                                        className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all hover:scale-105 text-sm md:text-base"
                                    >
                                        <LogIn className="w-4 h-4 mr-2" />
                                        Join Medrae Nursing
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-shrink-0 hidden md:block">
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md">
                                    <div className="flex items-center gap-3 text-slate-900">
                                        <div className="bg-emerald-100 rounded-full p-2">
                                            <Users className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500">Per Member</p>
                                            <p className="text-3xl font-black text-emerald-600">KSh 99</p>
                                            <p className="text-xs text-slate-400 line-through">Was KSh 199</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        <span>Save 50% on premium access</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                                        <Clock className="w-4 h-4 text-emerald-600" />
                                        <span>Instant activation for all members</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* Features Grid */}
                <AnimatedSection direction="up" delay={200}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0 mb-12 md:mb-16">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className={`bg-slate-50/50 hover:bg-white rounded-2xl p-5 md:p-6 border ${feature.highlight ? 'border-emerald-300 ring-2 ring-emerald-400/30' : 'border-slate-100'} shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-default group`}
                            >
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 ${feature.bg} group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className={`w-5 h-5 md:w-6 md:h-6 ${feature.color}`} />
                                </div>
                                <h4 className="font-bold text-slate-800 mb-1.5 md:mb-2 text-sm md:text-base">{feature.title}</h4>
                                <p className="text-[11px] md:text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                                {feature.saving && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-emerald-200">
                                        <Sparkles className="w-3 h-3" />
                                        {feature.saving}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </AnimatedSection>

                {/* Pricing Comparison */}
                <AnimatedSection direction="up" delay={250}>
                    <div className="mb-12 md:mb-16 px-3 md:px-0">
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-800 mb-6 md:mb-8 text-center">
                            How Much Can You Save?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:max-w-full md:px-4 lg:px-6 mx-auto">
                            {pricingComparison.map((plan, i) => (
                                <div
                                    key={i}
                                    className={`bg-slate-50/50 hover:bg-white rounded-2xl p-5 md:p-6 border ${plan.recommended ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-slate-100'} shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1`}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <plan.icon className={`w-5 h-5 ${plan.recommended ? 'text-emerald-600' : 'text-slate-500'}`} />
                                        <span className="font-bold text-slate-800">{plan.plan}</span>
                                        {plan.recommended && (
                                            <Badge className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white text-[8px] font-black uppercase tracking-wider border-0">
                                                Best Value
                                            </Badge>
                                        )}
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${plan.recommended ? 'text-emerald-600' : 'text-slate-700'}`}>
                                        {plan.price}
                                        <span className="text-xs font-medium text-slate-400"> /month</span>
                                    </p>
                                    {plan.savings && (
                                        <p className="text-xs text-emerald-600 font-bold mt-1">
                                            {plan.savings}
                                        </p>
                                    )}
                                    <ul className="mt-4 space-y-2">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-600">
                                                <CheckCircle className={`w-3 h-3 md:w-4 md:h-4 flex-shrink-0 mt-0.5 ${plan.recommended ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {plan.recommended && (
                                        <Button
                                            onClick={handleJoinClick}
                                            className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all hover:scale-105 text-sm"
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Join Medrae Nursing
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* Benefits Section */}
                <AnimatedSection direction="up" delay={300}>
                    <div className="bg-slate-50/50 hover:bg-white rounded-2xl p-5 md:p-8 border border-slate-100 shadow-sm mx-3 md:mx-0 mb-12 md:mb-16 transition-all duration-300">
                        <h3 className="text-lg md:text-xl lg:text-2xl font-black text-slate-800 mb-4 md:mb-6 text-center">
                            Why Nursing Students Love GroupPay
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {benefits.map((benefit, i) => (
                                <div
                                    key={i}
                                    className="bg-white rounded-xl p-4 md:p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-slate-100"
                                >
                                    <benefit.icon className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 mb-2 md:mb-3" />
                                    <h4 className="font-bold text-slate-800 text-sm md:text-base mb-1">{benefit.title}</h4>
                                    <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">{benefit.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* Testimonials */}
                <AnimatedSection direction="up" delay={350}>
                    <div className="mb-12 md:mb-16 px-3 md:px-0">
                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-800 mb-6 md:mb-8 text-center">
                            What Students Are Saying
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            {testimonials.map((testimonial, i) => (
                                <div
                                    key={i}
                                    className="bg-slate-50/50 hover:bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-200">
                                            <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{testimonial.name}</p>
                                            <p className="text-[10px] text-slate-500">{testimonial.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex mb-2">
                                        {[...Array(testimonial.rating)].map((_, idx) => (
                                            <Star key={idx} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed italic">
                                        "{testimonial.quote}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* CTA */}
                <AnimatedSection direction="up" delay={400}>
                    <div className="text-center mt-10 md:mt-12 px-4 md:px-0">
                        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-slate-100 rounded-2xl md:rounded-3xl p-8 md:p-12 shadow-lg hover:shadow-xl transition-all duration-500">
                            <h3 className="text-2xl md:text-4xl lg:text-5xl font-black text-slate-800 mb-3 md:mb-4">
                                Ready to Save & Study Together?
                            </h3>
                            <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed">
                                Join Medrae Nursing today and start saving money with GroupPay.
                                Form study groups, access premium content, and learn alongside fellow nursing students.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-black text-base md:text-lg px-8 md:px-10 py-5 md:py-6 rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                                    onClick={handleJoinClick}
                                >
                                    <Rocket className="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:animate-bounce" />
                                    Join Medrae Nursing
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 transition-transform group-hover:translate-x-2" />
                                </Button>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500 mt-4 font-medium">
                                🎉 10+ members = KSh 99 per member • Instant premium activation • No hidden fees
                            </p>
                        </div>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
};

export default GroupPayLandingSection;