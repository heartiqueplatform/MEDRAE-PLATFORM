// src/components/grouppay/GroupPayLandingSection.tsx
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users, Wallet, PiggyBank, Sparkles, ArrowRight, CheckCircle,
    Clock, BookOpen, UserPlus, DollarSign, Target, Crown,
    Smartphone, Network, Users2, LogIn, Rocket, ChevronRight,
} from "lucide-react";
import {
    GROUPPAY_CONFIG,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from "@/types/grouppay";
import { playSound } from "@/lib/soundManager";

/* ── Tap helper ── */
const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else navigator.vibrate(12);
    }
};

/* ── Scroll reveal ── */
const useIntersectionObserver = (options: IntersectionObserverInit = {}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px", ...options }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [options]);
    return [ref, isVisible] as const;
};

function AnimatedSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
    const [ref, isVisible] = useIntersectionObserver();
    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

/* ── Pricing constants ── */
const CURRENCY = GROUPPAY_CONFIG.CURRENCY;
const GROUP_1MO = getGroupPricePerMember("1-month");
const GROUP_2MO = getGroupPricePerMember("2-months");
const IND_1MO = getIndividualPrice("1-month");
const IND_2MO = getIndividualPrice("2-months");
const SAVE_1MO = getSavingsPerMember("1-month");
const SAVE_2MO = getSavingsPerMember("2-months");

/* ── Tone map (no dark variants) ── */
const TONES = {
    emerald: { chip: "bg-emerald-50", text: "text-emerald-600" },
    blue: { chip: "bg-blue-50", text: "text-blue-600" },
    amber: { chip: "bg-amber-50", text: "text-amber-600" },
    violet: { chip: "bg-violet-50", text: "text-violet-600" },
    rose: { chip: "bg-rose-50", text: "text-rose-600" },
    teal: { chip: "bg-teal-50", text: "text-teal-600" },
} as const;

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function GroupPayLandingSection() {
    const navigate = useNavigate();

    const features = [
        { icon: Wallet, tone: "emerald" as const, title: "Save from day one", description: `Split premium across your group and pay just ${CURRENCY} ${GROUP_2MO} each — instead of ${CURRENCY} ${IND_2MO} solo.`, saving: `Save ${CURRENCY} ${SAVE_2MO}` },
        { icon: Users2, tone: "blue" as const, title: "Built for study groups", description: "Form a group with classmates, share resources, and keep each other on track for exams." },
        { icon: Crown, tone: "amber" as const, title: "Premium for everyone", description: "When the group pays, every member unlocks premium instantly — no individual payments, no waiting." },
        { icon: Smartphone, tone: "violet" as const, title: "One M-Pesa payment", description: "The leader pays once via M-Pesa. Everyone else's account upgrades automatically within seconds." },
        { icon: Network, tone: "rose" as const, title: "Grow your circle", description: "Connect with nursing students from other schools, share notes, and build your professional network." },
        { icon: Target, tone: "teal" as const, title: "Study smarter", description: "Group learning beats solo. Cover more ground, stay motivated, and walk into exams prepared." },
    ];

    const pricingComparison = [
        {
            plan: "Individual Premium",
            price: `${CURRENCY} ${IND_2MO}`,
            priceUnit: "per 2 months",
            features: [
                "Full premium access", "Clinical assessments", "AI tutor feedback",
                "Progress tracking", "MedTube access", "Resources bank",
            ],
            icon: UserPlus,
            recommended: false,
            savings: null,
        },
        {
            plan: "GroupPay · 2 months",
            price: `${CURRENCY} ${GROUP_2MO}`,
            priceUnit: "per member · 2 months",
            features: [
                "Full premium access", "Clinical assessments", "AI tutor feedback",
                "Progress tracking", "MedTube access", "Resources bank",
                "Collaborative learning", "Group chat & support",
            ],
            icon: Users,
            recommended: true,
            savings: `Save ${CURRENCY} ${SAVE_2MO} each`,
        },
    ];

    const benefits = [
        { icon: DollarSign, title: "Budget-friendly", description: `From ${CURRENCY} ${GROUP_1MO} per member` },
        { icon: BookOpen, title: "Full premium access", description: "Every Medrae feature, unlocked" },
        { icon: Users, title: "Learn together", description: "Study with your classmates, not alone" },
        { icon: Sparkles, title: "Instant activation", description: "Access unlocks the moment you pay" },
    ];

    const handleJoinClick = () => {
        tap("success");
        navigate("/register");
    };

    return (
        <section id="grouppay" className="py-10 md:py-14 px-4 md:px-6 bg-white overflow-hidden">
            <div className="max-w-6xl mx-auto">

                {/* ── HEADER ── */}
                <AnimatedSection>
                    <div className="text-center mb-8 md:mb-12">

                        <h2 className="text-[26px] md:text-4xl lg:text-[44px] font-bold tracking-tighter
                                       text-slate-900 leading-tight">
                            Study together.
                            <br />
                            <span className="text-emerald-600">Pay a fraction.</span>
                        </h2>
                        <p className="mt-2.5 text-[14px] md:text-[15px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
                            Form a group with your classmates and unlock premium for every member
                            at a fraction of the solo price. Cheaper for you, cheaper for them,
                            better for everyone.
                        </p>
                    </div>
                </AnimatedSection>

                {/* ── HERO CARD ── */}
                <AnimatedSection delay={100}>
                    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-5 md:p-7
                                    mb-8 md:mb-10">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8">
                            <div className="space-y-3 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="h-4 w-4 text-emerald-600" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Smart savings for nursing students
                                    </span>
                                </div>
                                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">
                                    Pay less.{" "}
                                    <span className="text-emerald-600">Learn more.</span>
                                </h3>
                                <p className="text-[13px] md:text-[14px] text-slate-600 max-w-md leading-relaxed">
                                    Skip the {CURRENCY} {IND_2MO} solo price. Form a group and pay only{" "}
                                    <strong className="text-emerald-600 font-bold">
                                        {CURRENCY} {GROUP_2MO}
                                    </strong>{" "}
                                    each — that's{" "}
                                    <strong className="text-emerald-600 font-bold">
                                        {CURRENCY} {SAVE_2MO} saved
                                    </strong>{" "}
                                    for the same premium access.
                                </p>
                                <button
                                    onClick={handleJoinClick}
                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl
                                               bg-emerald-600 hover:bg-emerald-700 text-white
                                               text-[13px] font-bold
                                               hover:scale-[1.02] active:scale-[0.97] shadow-sm
                                               transition-all duration-300"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    <LogIn className="h-4 w-4" />
                                    Get started free
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Price panel */}
                            <div className="shrink-0 w-full md:w-auto">
                                <div className="rounded-xl bg-white ring-1 ring-slate-200/70 p-4 md:p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-11 w-11 rounded-xl bg-emerald-50
                                                        flex items-center justify-center shrink-0">
                                            <Users className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                Per member
                                            </p>
                                            <p className="text-2xl font-bold tabular-nums text-emerald-600 leading-none mt-0.5">
                                                {CURRENCY} {GROUP_2MO}
                                            </p>
                                            <p className="text-[10px] line-through tabular-nums text-slate-400 mt-0.5">
                                                Was {CURRENCY} {IND_2MO}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                            <span className="text-[11px] text-slate-600">
                                                Save {CURRENCY} {SAVE_2MO} per member
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                            <span className="text-[11px] text-slate-600">
                                                Instant activation for everyone
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── FEATURES ── */}
                <AnimatedSection delay={150}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8 md:mb-10">
                        {features.map((feature, index) => {
                            const tone = TONES[feature.tone];
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={index}
                                    className="rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm
                                               hover:shadow-md hover:-translate-y-0.5
                                               p-4 transition-all duration-300"
                                >
                                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center
                                                     ${tone.chip} ${tone.text}`}>
                                        <Icon className="h-4 w-4" strokeWidth={2.25} />
                                    </div>
                                    <h4 className="text-[13px] font-bold text-slate-900 leading-tight mt-3">
                                        {feature.title}
                                    </h4>
                                    <p className="text-[11.5px] text-slate-500 leading-relaxed mt-1.5">
                                        {feature.description}
                                    </p>
                                    {feature.saving && (
                                        <span className="inline-flex items-center gap-1
                                                         bg-emerald-50 text-emerald-700
                                                         text-[9px] font-bold uppercase tracking-wider
                                                         px-2 py-0.5 rounded-full mt-3">
                                            <Sparkles className="h-2.5 w-2.5" />
                                            {feature.saving}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </AnimatedSection>

                {/* ── PRICING COMPARISON ── */}
                <AnimatedSection delay={200}>
                    <div className="mb-8 md:mb-10">
                        <div className="text-center mb-5 md:mb-6">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">
                                Pricing
                            </p>
                            <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                                How much can you save?
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:max-w-3xl md:mx-auto">
                            {pricingComparison.map((plan, i) => {
                                const Icon = plan.icon;
                                return (
                                    <div
                                        key={i}
                                        className={`rounded-2xl p-5 transition-all duration-300
                                                    ${plan.recommended
                                                ? "bg-emerald-50 ring-2 ring-emerald-200"
                                                : "bg-white ring-1 ring-slate-100"}`}
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center
                                                             ${plan.recommended
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-slate-100 text-slate-600"}`}>
                                                <Icon className="h-4 w-4" strokeWidth={2.25} />
                                            </div>
                                            <span className="text-[13px] font-bold text-slate-900">
                                                {plan.plan}
                                            </span>
                                            {plan.recommended && (
                                                <span className="ml-auto bg-emerald-600 text-white
                                                                 text-[9px] font-bold uppercase tracking-wider
                                                                 px-2 py-0.5 rounded-full">
                                                    Best value
                                                </span>
                                            )}
                                        </div>

                                        <p className={`text-2xl font-bold tabular-nums leading-none
                                                       ${plan.recommended ? "text-emerald-600" : "text-slate-900"}`}>
                                            {plan.price}
                                            <span className="text-[10px] font-bold uppercase tracking-wider
                                                             text-slate-500 ml-1.5">
                                                {plan.priceUnit}
                                            </span>
                                        </p>

                                        {plan.savings && (
                                            <p className="text-[11px] font-bold mt-1 text-emerald-600">
                                                {plan.savings}
                                            </p>
                                        )}

                                        <ul className="mt-4 space-y-2">
                                            {plan.features.map((feature, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2
                                                               text-[11px] text-slate-600 leading-snug"
                                                >
                                                    <CheckCircle
                                                        className={`h-3.5 w-3.5 shrink-0 mt-0.5
                                                                    ${plan.recommended ? "text-emerald-600" : "text-slate-400"}`}
                                                    />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── BENEFITS ── */}
                <AnimatedSection delay={250}>
                    <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 p-5 md:p-6 mb-8 md:mb-10">
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
                            Why students love GroupPay
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {benefits.map((benefit, i) => {
                                const Icon = benefit.icon;
                                return (
                                    <div key={i} className="bg-white rounded-xl ring-1 ring-slate-100 p-3">
                                        <Icon className="h-4 w-4 text-emerald-600 mb-2" strokeWidth={2.25} />
                                        <p className="text-[12px] font-bold text-slate-900 leading-tight">
                                            {benefit.title}
                                        </p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                                            {benefit.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── FINAL CTA ── */}
                <AnimatedSection delay={300}>
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50
                                    ring-1 ring-emerald-100 p-6 md:p-10 text-center">
                        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-2">
                            Ready to split the cost?
                        </h3>
                        <p className="text-[13px] md:text-[14px] text-slate-600 max-w-2xl mx-auto mb-5 leading-relaxed">
                            Create your account, form a group with your classmates,
                            and unlock premium for everyone at a fraction of the price.
                            No hidden fees, no surprises.
                        </p>
                        <button
                            onClick={handleJoinClick}
                            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl
                                       bg-emerald-600 hover:bg-emerald-700 text-white
                                       text-[13px] font-bold
                                       hover:scale-[1.02] active:scale-[0.97] shadow-sm
                                       transition-all duration-300"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Rocket className="h-4 w-4" />
                            Create your account
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-3">
                            From {CURRENCY} {GROUP_1MO} per member · Instant activation · No hidden fees
                        </p>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
}