// src/components/grouppay/GroupPayLandingSection.tsx
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users, Sparkles, ArrowRight, CheckCircle, Clock,
    UserPlus, FileText, Zap, LogIn,
} from "lucide-react";
import {
    GROUPPAY_CONFIG,
    getGroupPricePerMember,
    getIndividualPrice,
    getSavingsPerMember,
} from "@/types/grouppay";
import { playSound } from "@/lib/soundManager";

const tap = (type: "light" | "success" = "light") => {
    playSound("ui-tap");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        if (type === "success") navigator.vibrate([15, 30, 15]);
        else navigator.vibrate(12);
    }
};

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

const CURRENCY = GROUPPAY_CONFIG.CURRENCY;
const GROUP_1MO = getGroupPricePerMember("1-month");
const GROUP_2MO = getGroupPricePerMember("2-months");
const IND_1MO = getIndividualPrice("1-month");
const IND_2MO = getIndividualPrice("2-months");
const SAVE_2MO = getSavingsPerMember("2-months");
const PER_PAPER_KSH = 49;

export default function GroupPayLandingSection() {
    const navigate = useNavigate();

    const handleJoinClick = () => {
        tap("success");
        navigate("/register");
    };

    return (
        <section id="grouppay" className="py-14 md:py-20 px-4 md:px-6 bg-white overflow-hidden">
            <div className="max-w-5xl mx-auto">

                {/* ── HEADLINE ── */}
                <AnimatedSection>
                    <div className="max-w-2xl mx-auto text-center mb-10 md:mb-12">
                        <h2 className="text-[32px] md:text-[44px] lg:text-[52px] font-bold
                                       tracking-[-0.02em] text-slate-900 leading-[1.05]">
                            Study together.<br />
                            <span className="text-emerald-600">Pay a fraction.</span>
                        </h2>
                        <p className="mt-4 text-[15px] md:text-[16px] text-slate-600 leading-relaxed max-w-xl mx-auto">
                            Form a group with your classmates and unlock full premium for
                            every member at {CURRENCY} {GROUP_2MO} each, instead of {CURRENCY}{" "}
                            {IND_2MO} paid solo. Cheaper for you, cheaper for them, and a
                            study circle that keeps everyone accountable.
                        </p>
                    </div>
                </AnimatedSection>

                {/* ── INTRO (compressed to 1 paragraph) ── */}
                <AnimatedSection delay={50}>
                    <div className="max-w-3xl mx-auto mb-12 md:mb-14">
                        <p className="text-[15px] md:text-[16px] text-slate-700 leading-relaxed">
                            Full premium on Medrae unlocks the entire platform. For one
                            student alone, {CURRENCY} {IND_2MO} is fair value. But for a group
                            preparing for the same exam, paying individually never made
                            sense. GroupPay fixes that: three or more students form a group,
                            each pays a share, and everyone unlocks the same premium at the
                            same time. The savings are real, and the study circle is the
                            bonus nobody expected to matter as much as it does.
                        </p>
                    </div>
                </AnimatedSection>

                {/* ── PRICING OPTIONS ── */}
                <AnimatedSection delay={100}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 mb-14 md:mb-20">
                        {/* Individual */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <UserPlus className="h-4 w-4 text-slate-500" strokeWidth={2.2} />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                    Individual
                                </p>
                            </div>
                            <p className="text-[34px] font-bold text-slate-900 tabular-nums leading-none tracking-tight">
                                {CURRENCY} {IND_2MO}
                            </p>
                            <p className="mt-1.5 text-[13px] text-slate-500">per 2 months · 1 user</p>
                            <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
                                Best if you prefer to study solo or can't coordinate with classmates right now.
                            </p>
                            <ul className="mt-5 space-y-2">
                                {[
                                    "Full premium access",
                                    "Clinical assessments & AI tutor",
                                    "Progress tracking & analytics",
                                    "MedTube & every resource",
                                    "No attempt limits",
                                ].map((f, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-700 leading-snug">
                                        <CheckCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" strokeWidth={2.4} />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleJoinClick}
                                className="mt-5 w-full h-11 rounded-xl border border-slate-300 hover:border-slate-400 bg-transparent hover:bg-slate-50 text-slate-700 text-[13px] font-semibold active:scale-[0.98] transition-all"
                                style={{ touchAction: "manipulation" }}
                            >
                                Choose individual
                            </button>
                        </div>

                        {/* GroupPay */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-emerald-600" strokeWidth={2.2} />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                    GroupPay · Best value
                                </p>
                            </div>
                            <p className="text-[34px] font-bold text-emerald-600 tabular-nums leading-none tracking-tight">
                                {CURRENCY} {GROUP_2MO}
                            </p>
                            <p className="mt-1.5 text-[13px] text-slate-500">per member · 2 months · group of 3+</p>
                            <p className="mt-2 text-[13px] text-emerald-700 font-medium leading-relaxed">
                                Save {CURRENCY} {SAVE_2MO} each. Same premium as Individual, plus a study circle.
                            </p>
                            <ul className="mt-5 space-y-2">
                                {[
                                    "Everything in Individual",
                                    "Group chat with your cohort",
                                    "Shared notes & resources",
                                    "Instant activation for everyone",
                                    "One M-Pesa transaction",
                                ].map((f, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-700 leading-snug">
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.4} />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleJoinClick}
                                className="mt-5 w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                style={{ touchAction: "manipulation" }}
                            >
                                Start with GroupPay
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                            </button>
                        </div>

                        {/* Per paper */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-blue-600" strokeWidth={2.2} />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                                    Pay per paper
                                </p>
                            </div>
                            <p className="text-[34px] font-bold text-blue-600 tabular-nums leading-none tracking-tight">
                                {PER_PAPER_KSH} KSh
                            </p>
                            <p className="mt-1.5 text-[13px] text-slate-500">per exam paper · no subscription</p>
                            <p className="mt-2 text-[13px] text-blue-700 font-medium leading-relaxed">
                                For one-off practice. Ideal for testing the platform or one specific exam.
                            </p>
                            <ul className="mt-5 space-y-2">
                                {[
                                    "Single exam paper access",
                                    "Full explanations on submission",
                                    "Score & analytics for that paper",
                                    "No credit card needed",
                                    "M-Pesa · under 30 seconds",
                                ].map((f, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-700 leading-snug">
                                        <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" strokeWidth={2.4} />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleJoinClick}
                                className="mt-5 w-full h-11 rounded-xl border border-slate-300 hover:border-slate-400 bg-transparent hover:bg-slate-50 text-slate-700 text-[13px] font-semibold active:scale-[0.98] transition-all"
                                style={{ touchAction: "manipulation" }}
                            >
                                Try a single paper
                            </button>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── WHY GROUP STUDY ── */}
                <AnimatedSection delay={150}>
                    <div className="max-w-3xl mx-auto mb-14 md:mb-20 pt-10 md:pt-12 border-t border-slate-200/70">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5">
                            Why group study works
                        </p>
                        <div className="space-y-4">
                            <p className="text-[14.5px] md:text-[15px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-900">It costs less and covers more.</span>{" "}
                                Splitting premium across a group turns a personal expense into a shared one. The content stays identical, the value stays the same, and nobody has to choose between eating and studying for a week.
                            </p>
                            <p className="text-[14.5px] md:text-[15px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-900">It keeps you accountable.</span>{" "}
                                When a classmate in the same group sees your progress, skipping a day doesn't feel like privacy. It feels like letting someone down. That small social pressure is the biggest reason students finish their revision.
                            </p>
                            <p className="text-[14.5px] md:text-[15px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-900">It builds a network you keep.</span>{" "}
                                Your group doesn't stop being useful after the exam. Most nurses who pass say the study circle they built in school mattered as much as anything they read.
                            </p>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── HOW IT WORKS ── */}
                <AnimatedSection delay={200}>
                    <div className="max-w-3xl mx-auto pt-10 md:pt-12 border-t border-slate-200/70 mb-14 md:mb-20">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5">
                            How GroupPay works
                        </p>
                        <div className="space-y-3.5">
                            {[
                                "Create your account, then create a group. You become the leader by default.",
                                "Invite classmates by link or phone. Nobody pays until the group is full.",
                                "Each member pays their share through M-Pesa: {CURRENCY} {GROUP_2MO} per person.",
                                "The moment the last member pays, everyone unlocks premium at once.",
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="shrink-0 text-[13px] font-semibold text-emerald-600 tabular-nums pt-0.5">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <p className="text-[14px] md:text-[15px] text-slate-700 leading-relaxed">
                                        {step.replace("{CURRENCY}", CURRENCY).replace("{GROUP_2MO}", String(GROUP_2MO))}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── WHAT EVERYONE GETS (condensed to 4 items) ── */}
                <AnimatedSection delay={225}>
                    <div className="max-w-3xl mx-auto mb-14 md:mb-20 pt-10 md:pt-12 border-t border-slate-200/70">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5">
                            What everyone in the group gets
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            {[
                                { title: "The full question bank", desc: "10,500+ exam-style questions across every unit and condition." },
                                { title: "Instant explanations", desc: "Every answer explained the moment you submit." },
                                { title: "AI performance prediction", desc: "Your NCK readiness score updated after every session." },
                                { title: "Progress & mistake tracking", desc: "Weak units surface automatically; mistakes get saved." },
                            ].map((item, i) => (
                                <div key={i}>
                                    <p className="text-[13.5px] md:text-[14px] font-semibold text-slate-900 leading-snug">
                                        {item.title}
                                    </p>
                                    <p className="mt-1 text-[12.5px] md:text-[13px] text-slate-500 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── PER PAPER EXPLAINER ── */}
                <AnimatedSection delay={250}>
                    <div className="max-w-3xl mx-auto mb-14 md:mb-20 pt-10 md:pt-12 border-t border-slate-200/70">
                        <div className="flex items-start gap-3">
                            <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-1" strokeWidth={2.4} />
                            <p className="text-[14.5px] md:text-[15px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-900">Not ready to commit?</span>{" "}
                                Unlock any single exam paper for {PER_PAPER_KSH} KSh. Full paper, instant explanations, score breakdown. No subscription, no card, no commitment. If you upgrade later, every attempt comes with you.
                            </p>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── FAQ (2 questions only) ── */}
                <AnimatedSection delay={275}>
                    <div className="max-w-3xl mx-auto mb-14 md:mb-20 pt-10 md:pt-12 border-t border-slate-200/70">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-5">
                            Common questions
                        </p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[14px] md:text-[15px] font-semibold text-slate-900 leading-snug">
                                    What if someone doesn't pay?
                                </p>
                                <p className="mt-1 text-[13.5px] md:text-[14px] text-slate-600 leading-relaxed">
                                    Nobody is charged until every member has paid. If someone doesn't pay by the deadline, the group simply doesn't activate. You can remove them and invite a replacement at any time.
                                </p>
                            </div>
                            <div>
                                <p className="text-[14px] md:text-[15px] font-semibold text-slate-900 leading-snug">
                                    Can I be in more than one group?
                                </p>
                                <p className="mt-1 text-[13.5px] md:text-[14px] text-slate-600 leading-relaxed">
                                    No. One active group at a time keeps pricing fair. You can leave and join another, but only one subscription can be active.
                                </p>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── CLOSING CTA ── */}
                <AnimatedSection delay={300}>
                    <div className="max-w-2xl mx-auto text-center">
                        <h3 className="text-[24px] md:text-[30px] font-bold text-slate-900 tracking-[-0.02em] leading-tight">
                            Ready to split the cost?
                        </h3>
                        <p className="mt-3 text-[14px] md:text-[15px] text-slate-600 leading-relaxed">
                            Create a free account, invite your study group, and unlock
                            premium for everyone from {CURRENCY} {GROUP_1MO} per member.
                        </p>
                        <button
                            onClick={handleJoinClick}
                            className="mt-5 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[14px] font-semibold active:scale-[0.98] transition-all"
                            style={{ touchAction: "manipulation" }}
                        >
                            Create your account
                            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                        </button>
                        <p className="mt-4 text-[12px] text-slate-500">
                            Free to start · No credit card · Instant activation
                        </p>
                    </div>
                </AnimatedSection>

            </div>
        </section>
    );
}