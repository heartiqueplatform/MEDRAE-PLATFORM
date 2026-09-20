// src/components/grouppay/GroupPayLandingSection.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Wallet,
    PiggyBank,
    Sparkles,
    ArrowRight,
    CheckCircle,
    Clock,
    BookOpen,
    UserPlus,
    DollarSign,
    Target,
    Crown,
    Smartphone,
    Network,
    Users2,
    LogIn,
    Rocket,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
    GROUPPAY_CONFIG,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from "@/types/grouppay";

// ============================================================
// GitHub dark palette (hardcoded, flat only)
// ============================================================
const GH = {
    bg: "#0d1117",
    surface: "#161b22",
    surfaceHover: "#1c2128",
    text: "#e6edf3",
    textMuted: "#8b949e",
    textDim: "#6e7681",
    green: "#3fb950",
    greenBg: "#12261e",
    blue: "#58a6ff",
    blueBg: "#0c2d6b",
    yellow: "#d29922",
    yellowBg: "#3a2d00",
    purple: "#a371f7",
    purpleBg: "#2d1b4e",
    red: "#f85149",
    redBg: "#4b1113",
    indigo: "#a371f7",
    indigoBg: "#2d1b4e",
};

// ============================================================
// ANIMATION UTILITY
// ============================================================
const useIntersectionObserver = (options = {}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px", ...options }
        );
        if (ref.current) observer.observe(ref.current);
        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, [options]);

    return [ref, isVisible];
};

const AnimatedSection = ({ children, className = "", delay = 0, direction = "up" }: any) => {
    const [ref, isVisible] = useIntersectionObserver();

    const getTransform = () => {
        switch (direction) {
            case "up": return "translateY(60px)";
            case "down": return "translateY(-60px)";
            case "left": return "translateX(-60px)";
            case "right": return "translateX(60px)";
            default: return "translateY(60px)";
        }
    };

    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0"}`}
            style={{
                transform: isVisible ? "translateY(0)" : getTransform(),
                transitionDelay: `${delay}ms`,
                ...(className ? { className } : {}),
            }}
        >
            {children}
        </div>
    );
};

// ============================================================
// PRICING — all derived from config, no hardcoded values
// ============================================================
const CURRENCY = GROUPPAY_CONFIG.CURRENCY;

const GROUP_1MO = getGroupPricePerMember("1-month");
const GROUP_2MO = getGroupPricePerMember("2-months");
const IND_1MO = getIndividualPrice("1-month");
const IND_2MO = getIndividualPrice("2-months");
const SAVE_1MO = getSavingsPerMember("1-month");
const SAVE_2MO = getSavingsPerMember("2-months");

const GroupPayLandingSection = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: Wallet,
            title: "Save from Day One",
            description: `Split premium across your group and pay just ${CURRENCY} ${GROUP_2MO} each — instead of ${CURRENCY} ${IND_2MO} solo.`,
            color: GH.green,
            bg: GH.greenBg,
            saving: `Save ${CURRENCY} ${SAVE_2MO}`,
        },
        {
            icon: Users2,
            title: "Built for Study Groups",
            description:
                "Form a group with classmates, share resources, and keep each other on track for exams.",
            color: GH.blue,
            bg: GH.blueBg,
            saving: null,
        },
        {
            icon: Crown,
            title: "Premium for Everyone",
            description:
                "When the group pays, every member unlocks premium instantly — no individual payments, no waiting.",
            color: GH.yellow,
            bg: GH.yellowBg,
            saving: null,
        },
        {
            icon: Smartphone,
            title: "One M-Pesa Payment",
            description:
                "The leader pays once via M-Pesa. Everyone else's account upgrades automatically within seconds.",
            color: GH.purple,
            bg: GH.purpleBg,
            saving: null,
        },
        {
            icon: Network,
            title: "Grow Your Circle",
            description:
                "Connect with nursing students from other schools, share notes, and build your professional network early.",
            color: GH.indigo,
            bg: GH.indigoBg,
            saving: null,
        },
        {
            icon: Target,
            title: "Study Smarter",
            description:
                "Group learning beats solo. Cover more ground, stay motivated, and walk into exams prepared.",
            color: GH.red,
            bg: GH.redBg,
            saving: null,
        },
    ];

    const pricingComparison = [
        {
            plan: "Individual Premium",
            price: `${CURRENCY} ${IND_2MO}`,
            priceUnit: "per 2 months",
            features: [
                "Full premium access",
                "Clinical assessments",
                "AI tutor feedback",
                "Progress tracking",
                "MedTube access",
                "Resources bank",
            ],
            icon: UserPlus,
            recommended: false,
            savings: null,
        },
        {
            plan: "GroupPay · 2 Months",
            price: `${CURRENCY} ${GROUP_2MO}`,
            priceUnit: "per member · 2 months",
            features: [
                "Full premium access",
                "Clinical assessments",
                "AI tutor feedback",
                "Progress tracking",
                "MedTube access",
                "Resources bank",
                "Collaborative learning",
                "Group chat & support",
            ],
            icon: Users,
            recommended: true,
            savings: `Save ${CURRENCY} ${SAVE_2MO} each`,
        },
    ];

    const benefits = [
        {
            icon: DollarSign,
            title: "Budget-Friendly",
            description: `From ${CURRENCY} ${GROUP_1MO} per member`,
        },
        {
            icon: BookOpen,
            title: "Full Premium Access",
            description: "Every Medrae feature, unlocked",
        },
        {
            icon: Users,
            title: "Learn Together",
            description: "Study with your classmates, not alone",
        },
        {
            icon: Sparkles,
            title: "Instant Activation",
            description: "Access unlocks the moment you pay",
        },
    ];

    const handleJoinClick = () => {
        navigate("/register");
    };

    return (
        <section
            id="grouppay"
            className="py-16 md:py-24 px-0 md:px-4 overflow-hidden"
            style={{ backgroundColor: GH.bg, color: GH.text }}
        >
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <AnimatedSection direction="up">
                    <div className="text-center mb-12 md:mb-16 px-4 md:px-0">
                        <h2
                            className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tighter leading-[1.05]"
                            style={{ color: GH.text }}
                        >
                            Study together.
                            <br />
                            <span style={{ color: GH.green }}>
                                Pay a fraction. Unlock everything.
                            </span>
                        </h2>
                        <p
                            className="text-sm md:text-lg lg:text-xl max-w-3xl mx-auto mt-4 font-medium leading-relaxed"
                            style={{ color: GH.textMuted }}
                        >
                            Form a group with your classmates and unlock premium for every member at a fraction
                            of the solo price. Cheaper for you, cheaper for them, better for everyone.
                        </p>
                    </div>
                </AnimatedSection>

                {/* MAIN HERO CARD */}
                <AnimatedSection direction="up" delay={150}>
                    <div
                        className="rounded-3xl p-6 md:p-10 mb-12 md:mb-16 mx-3 md:mx-0"
                        style={{ backgroundColor: GH.surface }}
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                            <div className="space-y-4 md:space-y-5">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="w-5 h-5 md:w-6 md:h-6" style={{ color: GH.green }} />
                                    <span
                                        className="text-[10px] md:text-xs font-black uppercase tracking-widest"
                                        style={{ color: GH.textMuted }}
                                    >
                                        Smart savings for nursing students
                                    </span>
                                </div>
                                <h3
                                    className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight"
                                    style={{ color: GH.text }}
                                >
                                    Pay less.
                                    <br />
                                    <span style={{ color: GH.green }}>Learn more.</span>
                                </h3>
                                <p
                                    className="text-sm md:text-base max-w-md leading-relaxed"
                                    style={{ color: GH.textMuted }}
                                >
                                    Skip the {CURRENCY} {IND_2MO} solo price. Form a group and pay only{" "}
                                    <span className="font-bold" style={{ color: GH.green }}>
                                        {CURRENCY} {GROUP_2MO}
                                    </span>{" "}
                                    each — that's{" "}
                                    <span className="font-bold" style={{ color: GH.green }}>
                                        {CURRENCY} {SAVE_2MO} saved
                                    </span>{" "}
                                    for the same premium access.
                                </p>
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <Button
                                        onClick={handleJoinClick}
                                        className="border-0 rounded-xl text-white font-bold py-2.5 md:py-3 px-6 md:px-8 hover:scale-105 transition-all text-sm md:text-base"
                                        style={{ backgroundColor: GH.green }}
                                    >
                                        <LogIn className="w-4 h-4 mr-2" />
                                        Get Started Free
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-shrink-0 hidden md:block">
                                <div
                                    className="rounded-2xl p-6"
                                    style={{ backgroundColor: GH.bg }}
                                >
                                    <div className="flex items-center gap-3" style={{ color: GH.text }}>
                                        <div className="rounded-full p-2" style={{ backgroundColor: GH.greenBg }}>
                                            <Users className="w-8 h-8" style={{ color: GH.green }} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium" style={{ color: GH.textMuted }}>
                                                Per member
                                            </p>
                                            <p
                                                className="text-3xl font-black tabular-nums"
                                                style={{ color: GH.green }}
                                            >
                                                {CURRENCY} {GROUP_2MO}
                                            </p>
                                            <p
                                                className="text-xs line-through tabular-nums"
                                                style={{ color: GH.textDim }}
                                            >
                                                Was {CURRENCY} {IND_2MO}
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className="mt-4 pt-4 flex items-center gap-2 text-xs"
                                        style={{ color: GH.textMuted }}
                                    >
                                        <CheckCircle className="w-4 h-4" style={{ color: GH.green }} />
                                        <span>Save {CURRENCY} {SAVE_2MO} per member</span>
                                    </div>
                                    <div
                                        className="mt-2 flex items-center gap-2 text-xs"
                                        style={{ color: GH.textMuted }}
                                    >
                                        <Clock className="w-4 h-4" style={{ color: GH.green }} />
                                        <span>Instant activation for everyone</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* FEATURES GRID */}
                <AnimatedSection direction="up" delay={200}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-3 md:px-0 mb-12 md:mb-16">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="rounded-2xl p-5 md:p-6 hover:-translate-y-1 transition-all duration-300 cursor-default group"
                                style={{ backgroundColor: GH.surface }}
                            >
                                <div
                                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300"
                                    style={{ backgroundColor: feature.bg }}
                                >
                                    <feature.icon
                                        className="w-5 h-5 md:w-6 md:h-6"
                                        style={{ color: feature.color }}
                                    />
                                </div>
                                <h4
                                    className="font-bold mb-1.5 md:mb-2 text-sm md:text-base"
                                    style={{ color: GH.text }}
                                >
                                    {feature.title}
                                </h4>
                                <p
                                    className="text-[11px] md:text-sm leading-relaxed"
                                    style={{ color: GH.textMuted }}
                                >
                                    {feature.description}
                                </p>
                                {feature.saving && (
                                    <div
                                        className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider"
                                        style={{ backgroundColor: GH.greenBg, color: GH.green }}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        {feature.saving}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </AnimatedSection>

                {/* PRICING COMPARISON */}
                <AnimatedSection direction="up" delay={250}>
                    <div className="mb-12 md:mb-16 px-3 md:px-0">
                        <h3
                            className="text-xl md:text-2xl lg:text-3xl font-black mb-6 md:mb-8 text-center"
                            style={{ color: GH.text }}
                        >
                            How much can you save?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 md:max-w-4xl mx-auto">
                            {pricingComparison.map((plan, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1"
                                    style={{
                                        backgroundColor: plan.recommended ? GH.surfaceHover : GH.surface,
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <plan.icon
                                            className="w-5 h-5"
                                            style={{ color: plan.recommended ? GH.green : GH.textMuted }}
                                        />
                                        <span className="font-bold" style={{ color: GH.text }}>
                                            {plan.plan}
                                        </span>
                                        {plan.recommended && (
                                            <Badge
                                                className="border-0 text-white text-[9px] font-black uppercase tracking-wider"
                                                style={{ backgroundColor: GH.green }}
                                            >
                                                Best value
                                            </Badge>
                                        )}
                                    </div>
                                    <p
                                        className="text-2xl md:text-3xl font-black tabular-nums"
                                        style={{ color: plan.recommended ? GH.green : GH.text }}
                                    >
                                        {plan.price}
                                        <span
                                            className="text-xs font-medium ml-1"
                                            style={{ color: GH.textDim }}
                                        >
                                            {plan.priceUnit}
                                        </span>
                                    </p>
                                    {plan.savings && (
                                        <p className="text-xs font-bold mt-1" style={{ color: GH.green }}>
                                            {plan.savings}
                                        </p>
                                    )}
                                    <ul className="mt-4 space-y-2">
                                        {plan.features.map((feature, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2 text-xs md:text-sm"
                                                style={{ color: GH.textMuted }}
                                            >
                                                <CheckCircle
                                                    className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 mt-0.5"
                                                    style={{
                                                        color: plan.recommended ? GH.green : GH.textDim,
                                                    }}
                                                />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* BENEFITS */}
                <AnimatedSection direction="up" delay={300}>
                    <div
                        className="rounded-2xl p-5 md:p-8 mx-3 md:mx-0 mb-12 md:mb-16"
                        style={{ backgroundColor: GH.surface }}
                    >
                        <h3
                            className="text-lg md:text-xl lg:text-2xl font-black mb-4 md:mb-6 text-center"
                            style={{ color: GH.text }}
                        >
                            Why students love GroupPay
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            {benefits.map((benefit, i) => (
                                <div
                                    key={i}
                                    className="rounded-xl p-4 md:p-5 hover:-translate-y-1 transition-all duration-300"
                                    style={{ backgroundColor: GH.bg }}
                                >
                                    <benefit.icon
                                        className="w-5 h-5 md:w-6 md:h-6 mb-2 md:mb-3"
                                        style={{ color: GH.green }}
                                    />
                                    <h4
                                        className="font-bold text-sm md:text-base mb-1"
                                        style={{ color: GH.text }}
                                    >
                                        {benefit.title}
                                    </h4>
                                    <p
                                        className="text-[10px] md:text-xs leading-relaxed"
                                        style={{ color: GH.textMuted }}
                                    >
                                        {benefit.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* FINAL CTA */}
                <AnimatedSection direction="up" delay={400}>
                    <div className="text-center mt-10 md:mt-12 px-4 md:px-0">
                        <div
                            className="rounded-3xl p-8 md:p-12"
                            style={{ backgroundColor: GH.surface }}
                        >
                            <h3
                                className="text-2xl md:text-4xl lg:text-5xl font-black mb-3 md:mb-4 leading-tight"
                                style={{ color: GH.text }}
                            >
                                Ready to split the cost?
                            </h3>
                            <p
                                className="text-sm md:text-base max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed"
                                style={{ color: GH.textMuted }}
                            >
                                Create your account, form a group with your classmates, and unlock premium
                                for everyone at a fraction of the price. No hidden fees, no surprises.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    className="border-0 rounded-2xl text-white font-black text-base md:text-lg px-8 md:px-10 py-5 md:py-6 hover:scale-105 transition-all duration-300 group"
                                    style={{ backgroundColor: GH.green }}
                                    onClick={handleJoinClick}
                                >
                                    <Rocket className="w-4 h-4 md:w-5 md:h-5 mr-2 group-hover:animate-bounce" />
                                    Create Your Account
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 transition-transform group-hover:translate-x-2" />
                                </Button>
                            </div>
                            <p
                                className="text-[10px] md:text-xs mt-4 font-medium"
                                style={{ color: GH.textMuted }}
                            >
                                From {CURRENCY} {GROUP_1MO} per member · Instant premium activation · No hidden fees
                            </p>
                        </div>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
};

export default GroupPayLandingSection;