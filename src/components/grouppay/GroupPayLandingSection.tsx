// src/components/grouppay/GroupPayLandingSection.tsx
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users, Wallet, PiggyBank, Sparkles, ArrowRight, CheckCircle,
    Clock, BookOpen, UserPlus, DollarSign, Target, Crown,
    Smartphone, Network, Users2, LogIn, Rocket, ChevronRight,
    FileText, Zap, CreditCard,
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

/* ── Per-paper fallback price ── */
const PER_PAPER_KSH = 49;

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function GroupPayLandingSection() {
    const navigate = useNavigate();

    const features = [
        { icon: Wallet, color: "text-emerald-600", title: "Save from day one", description: `Split premium across your group and pay just ${CURRENCY} ${GROUP_2MO} each — instead of ${CURRENCY} ${IND_2MO} solo.` },
        { icon: Users2, color: "text-blue-600", title: "Built for study groups", description: "Form a group with classmates, share resources, and keep each other on track for exams." },
        { icon: Crown, color: "text-amber-600", title: "Premium for everyone", description: "When the group pays, every member unlocks premium instantly — no individual payments, no waiting." },
        { icon: Smartphone, color: "text-violet-600", title: "One M-Pesa payment", description: "The leader pays once via M-Pesa. Everyone else's account upgrades automatically within seconds." },
        { icon: Network, color: "text-rose-600", title: "Grow your circle", description: "Connect with nursing students from other schools, share notes, and build your professional network." },
        { icon: Target, color: "text-cyan-600", title: "Study smarter", description: "Group learning beats solo. Cover more ground, stay motivated, and walk into exams prepared." },
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

                {/* ── HERO — no card ── */}
                <AnimatedSection delay={100}>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 mb-10 md:mb-14 items-center">

                        {/* Left: pitch */}
                        <div>
                            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                                Pay less.{" "}
                                <span className="text-emerald-600">Learn more.</span>
                            </h3>
                            <p className="mt-4 text-[14px] md:text-[15px] text-slate-600 leading-relaxed max-w-md">
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
                                className="mt-6 inline-flex items-center gap-2
                                           px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700
                                           text-white text-[13px] font-bold
                                           hover:scale-[1.02] active:scale-[0.97]
                                           transition-all duration-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                <LogIn className="h-4 w-4" />
                                Get started free
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Right: price block, no card */}
                        <div className="lg:pl-8 lg:border-l border-slate-200/70 pt-6 lg:pt-0 border-t lg:border-t-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                                Per member · group of 3+
                            </p>

                            <div className="flex items-baseline gap-1.5">
                                <p className="text-[56px] md:text-[72px] font-bold text-slate-900 tabular-nums leading-none tracking-tighter">
                                    {GROUP_2MO}
                                </p>
                                <span className="text-[20px] font-bold text-emerald-600 leading-none">
                                    {CURRENCY}
                                </span>
                            </div>
                            <p className="text-[13px] text-slate-500 mt-1.5">
                                per member for 2 months
                            </p>

                            <div className="mt-5 pt-5 border-t border-slate-200/70 space-y-2.5">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-[12px] text-slate-600">
                                        Save {CURRENCY} {SAVE_2MO} per member
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span className="text-[12px] text-slate-600">
                                        Instant activation for everyone
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 text-emerald-600 shrink-0 flex items-center justify-center text-[10px] font-bold">
                                        ∞
                                    </span>
                                    <span className="text-[12px] text-slate-600">
                                        No attempt limit · No hidden fees
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── FEATURES — no cards, paragraph list ── */}
                <AnimatedSection delay={150}>
                    <div className="mb-12 md:mb-16">
                        <div className="max-w-2xl mb-8">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                                What you get with GroupPay
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                            {features.map((feature, i) => {
                                const Icon = feature.icon;
                                return (
                                    <div key={i} className="flex gap-3">
                                        <Icon className={`w-5 h-5 ${feature.color} shrink-0 mt-0.5`} strokeWidth={2.2} />
                                        <div className="min-w-0">
                                            <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                                                {feature.title}
                                            </p>
                                            <p className="text-[12.5px] text-slate-500 leading-relaxed mt-1.5">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── THREE OPTIONS COMPARISON — no card outlines ── */}
                <AnimatedSection delay={200}>
                    <div className="mb-12 md:mb-16">
                        <div className="text-center mb-8">
                            <h3 className="text-[24px] md:text-3xl font-bold text-slate-900 tracking-tight">
                                Three ways to unlock premium.
                            </h3>
                            <p className="mt-2 text-[13px] md:text-[14px] text-slate-500 max-w-lg mx-auto leading-relaxed">
                                Subscribe solo, split it with your group, or pay per paper —
                                whatever fits your budget.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">

                            {/* OPTION 1 — Individual */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <UserPlus className="h-4 w-4 text-slate-500" />
                                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                        Individual
                                    </p>
                                </div>
                                <p className="text-[28px] md:text-[32px] font-bold text-slate-900 tabular-nums leading-none tracking-tighter">
                                    {IND_2MO}
                                    <span className="text-[14px] font-bold text-slate-500 ml-1.5">
                                        {CURRENCY}
                                    </span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    per 2 months · 1 user
                                </p>
                                <ul className="mt-5 space-y-2">
                                    {[
                                        "Full premium access",
                                        "Clinical assessments",
                                        "AI tutor feedback",
                                        "Progress tracking",
                                        "MedTube access",
                                        "Resources bank",
                                    ].map((f, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-snug">
                                            <CheckCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* OPTION 2 — GroupPay (recommended) */}
                            <div className="md:bg-emerald-50 md:-mx-4 md:px-4 md:py-6 md:rounded-2xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-emerald-600" />
                                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                                        GroupPay · Best value
                                    </p>
                                </div>
                                <p className="text-[28px] md:text-[32px] font-bold text-emerald-600 tabular-nums leading-none tracking-tighter">
                                    {GROUP_2MO}
                                    <span className="text-[14px] font-bold text-emerald-600 ml-1.5">
                                        {CURRENCY}
                                    </span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    per member · 2 months · group of 3+
                                </p>
                                <p className="text-[11px] font-bold text-emerald-600 mt-2">
                                    Save {CURRENCY} {SAVE_2MO} each vs solo
                                </p>
                                <ul className="mt-5 space-y-2">
                                    {[
                                        "Full premium access",
                                        "Clinical assessments",
                                        "AI tutor feedback",
                                        "Progress tracking",
                                        "MedTube access",
                                        "Resources bank",
                                        "Collaborative learning",
                                        "Group chat & support",
                                    ].map((f, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[11.5px] text-slate-700 leading-snug">
                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* OPTION 3 — Per-paper (fallback) */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-700">
                                        Pay per paper
                                    </p>
                                </div>
                                <p className="text-[28px] md:text-[32px] font-bold text-blue-600 tabular-nums leading-none tracking-tighter">
                                    {PER_PAPER_KSH}
                                    <span className="text-[14px] font-bold text-blue-600 ml-1.5">
                                        KSh
                                    </span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    per exam paper · no subscription
                                </p>
                                <p className="text-[11px] font-bold text-blue-600 mt-2">
                                    For students who can't commit
                                </p>
                                <ul className="mt-5 space-y-2">
                                    {[
                                        "Access to that exam paper only",
                                        "Full explanations after submission",
                                        "Score & analytics for that paper",
                                        "No monthly commitment",
                                        "No credit card required",
                                        "Pay via M-Pesa instantly",
                                        "Upgrade to subscription anytime",
                                    ].map((f, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-snug">
                                            <CheckCircle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Per-paper explainer */}
                        <div className="mt-8 pt-6 border-t border-slate-200/70">
                            <div className="flex items-start gap-2.5 max-w-3xl">
                                <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" strokeWidth={2.4} />
                                <p className="text-[12.5px] text-slate-600 leading-relaxed">
                                    <strong className="text-slate-900">New: pay-as-you-go exams.</strong>{" "}
                                    If a full subscription is out of reach right now, unlock any single
                                    exam paper for just {PER_PAPER_KSH} KSh. You get the full paper,
                                    instant explanations on submission, and your score breakdown for
                                    that paper — no subscription, no commitment. Perfect for testing
                                    the platform or preparing for one specific exam. Upgrade to
                                    GroupPay or individual Premium any time and keep all your progress.
                                </p>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── BENEFITS — no cards ── */}
                <AnimatedSection delay={250}>
                    <div className="mb-12 md:mb-16 pt-8 border-t border-slate-200/70">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5">
                            Why students love GroupPay
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {benefits.map((benefit, i) => {
                                const Icon = benefit.icon;
                                return (
                                    <div key={i}>
                                        <Icon className="h-4 w-4 text-emerald-600 mb-2" strokeWidth={2.25} />
                                        <p className="text-[12.5px] font-bold text-slate-900 leading-tight">
                                            {benefit.title}
                                        </p>
                                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
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
                    <div className="bg-gradient-to-br from-emerald-50 via-slate-50 to-blue-50
                                    rounded-2xl p-6 md:p-10 text-center">
                        <h3 className="text-[24px] md:text-3xl font-bold text-slate-900 leading-tight mb-2">
                            Ready to split the cost?
                        </h3>
                        <p className="text-[13px] md:text-[14px] text-slate-600 max-w-2xl mx-auto mb-5 leading-relaxed">
                            Create your account, form a group with your classmates, and unlock
                            premium for everyone at a fraction of the price. Or start with a
                            single paper for {PER_PAPER_KSH} KSh — no commitment, no surprises.
                        </p>
                        <button
                            onClick={handleJoinClick}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                                       bg-emerald-600 hover:bg-emerald-700 text-white
                                       text-[13px] font-bold
                                       hover:scale-[1.02] active:scale-[0.97]
                                       transition-all duration-300"
                            style={{ touchAction: "manipulation" }}
                        >
                            <Rocket className="h-4 w-4" />
                            Create your account
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-3">
                            From {CURRENCY} {GROUP_1MO} per member · or {PER_PAPER_KSH} KSh per paper · Instant activation
                        </p>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
}