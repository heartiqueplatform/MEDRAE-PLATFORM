// src/pages/landing/StaffLanding.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight, Coins, Award, ShieldCheck, Star,
    TrendingUp, Trophy, BookOpen, Clock, Users, CheckCircle2,
    Wallet, FileText, BarChart3, Sparkles,
} from "lucide-react";
import {
    StaffTopNav,
    StaffSidebarMobileTrigger,
    StaffSidebarDrawer,
} from "@/components/index/StaffSidebar";
import SiteFooter from "@/components/index/SiteFooter";
import { FloatingWhatsApp } from "@/components/index/FloatingWhatsApp";

export default function StaffLanding() {
    const nav = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Hide page scrollbar while this landing is mounted
    useEffect(() => {
        const style = document.createElement("style");
        style.id = "hide-scrollbar-staff-landing";
        style.textContent = `
            html::-webkit-scrollbar,
            body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
            html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        `;
        document.head.appendChild(style);
        return () => {
            document.getElementById("hide-scrollbar-staff-landing")?.remove();
        };
    }, []);

    const handleSwitchRole = () => {
        localStorage.removeItem("medrae.persona");
        sessionStorage.removeItem("medrae.seen_chooser");
        nav("/");
    };

    return (
        <div className="min-h-screen w-full overflow-x-hidden relative bg-slate-50">

            {/* Desktop: top nav. Mobile: trigger → drawer */}
            <StaffTopNav />
            <StaffSidebarMobileTrigger onOpen={() => setDrawerOpen(true)} />
            <StaffSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* Spacer for the fixed 64px top bar (desktop only) */}
            <div className="hidden lg:block h-16" aria-hidden />

            {/* ═══════════════ HERO ═══════════════ */}
            <section id="home" className="relative w-full py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-14 items-center">

                    {/* LEFT — headline + CTA */}
                    <div>
                        <h1 className="text-[34px] sm:text-5xl md:text-6xl font-bold tracking-[-0.03em] leading-[1.02] text-slate-900">
                            Earn CPD points.<br />
                            <span className="text-emerald-600">Get paid for what you know.</span>
                        </h1>

                        <p className="mt-5 text-[15px] md:text-[16px] text-slate-600 max-w-xl leading-relaxed">
                            Your nursing career shouldn't live in a shoebox of paper certificates.
                            Track your NCK licence, complete accredited CPD activities, and earn
                            MedraeCoins every time another nurse learns from your published work —
                            all in one portfolio that renews itself.
                        </p>

                        <div className="mt-7 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => nav("/register")}
                                className="inline-flex items-center justify-center gap-2
                                           px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500
                                           text-white font-bold text-[14px]
                                           hover:scale-[1.02] active:scale-[0.97]
                                           transition-all duration-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                Create my portfolio <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => nav("/login")}
                                className="inline-flex items-center justify-center gap-2
                                           px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100
                                           text-slate-700 font-bold text-[14px]
                                           hover:scale-[1.02] active:scale-[0.97]
                                           transition-all duration-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                Sign in
                            </button>
                        </div>

                        <p className="mt-5 text-[12px] text-slate-500">
                            Wrong role?{" "}
                            <button
                                onClick={handleSwitchRole}
                                className="text-emerald-600 font-bold hover:underline"
                            >
                                Choose again
                            </button>
                        </p>
                    </div>

                    {/* RIGHT — stat block, no card */}
                    <div className="lg:pl-8 lg:border-l border-slate-200/70 pt-8 lg:pt-0 border-t lg:border-t-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                            The Medrae CPD network
                        </p>

                        <div className="space-y-4">
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <p className="text-[56px] md:text-[72px] font-bold text-slate-900 tabular-nums leading-none tracking-tighter">
                                        20
                                    </p>
                                    <span className="text-[24px] font-bold text-emerald-600 leading-none">
                                        MC
                                    </span>
                                </div>
                                <p className="text-[13px] text-slate-500 mt-1.5">
                                    earned by you every time another nurse completes one of your CPD activities.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-200/70 space-y-2.5">
                                {[
                                    { label: "CPD points required per year", value: "20" },
                                    { label: "Minutes to build a portfolio", value: "5" },
                                    { label: "Certificates auto-generated", value: "∞" },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-baseline justify-between gap-3">
                                        <span className="text-[12px] font-semibold text-slate-500">{row.label}</span>
                                        <span className="text-[15px] font-bold text-slate-900 tabular-nums">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ WHAT YOU GET ═══════════════ */}
            <section id="benefits" className="w-full py-12 md:py-16 px-4 md:px-6 bg-white">
                <div className="max-w-6xl mx-auto">

                    {/* Section intro */}
                    <div className="max-w-2xl mb-10">
                        <h2 className="text-[26px] md:text-4xl font-bold tracking-tighter text-slate-900 leading-tight">
                            Everything a Kenyan nurse{" "}
                            <span className="text-emerald-600">actually needs.</span>
                        </h2>
                        <p className="mt-3 text-[14px] md:text-[15px] text-slate-500 leading-relaxed">
                            Not abstract "learning features." The specific tools that keep your
                            NCK licence current, your CPD folder organised, and your expertise
                            recognised — in one place.
                        </p>
                    </div>

                    {/* Two-column paragraph list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {[
                            {
                                icon: Award,
                                accent: "text-emerald-600",
                                title: "A CPD portfolio that builds itself",
                                desc: "Every activity you complete logs an audit-ready certificate with a unique verification code. Employers, NCK, or anyone you share it with can verify the certificate in one click. Download your entire CPD history as a single PDF. No more chasing paper certificates. No more scrambling when renewal season arrives.",
                            },
                            {
                                icon: Coins,
                                accent: "text-amber-600",
                                title: "Earn MedraeCoins for teaching",
                                desc: "Publish an accredited CPD activity and earn 20 MedraeCoins every time another nurse completes it. That's real money at 0.01 per coin — plus airtime, premium features, and cash withdrawal once you cross the minimum threshold. The more useful your teaching, the more you earn.",
                            },
                            {
                                icon: ShieldCheck,
                                accent: "text-blue-600",
                                title: "Verified contributor status",
                                desc: "One verification. Lifelong badge. We confirm your NCK licence and employer to give you a verified author mark that follows you across every activity you publish. Nurses who see your badge know they're learning from someone who's actually qualified to teach — not an anonymous internet account.",
                            },
                            {
                                icon: Star,
                                accent: "text-violet-600",
                                title: "Peer ratings that actually matter",
                                desc: "Every activity you publish gets rated by real nurses who completed it. Not bought reviews. Not paid ratings. Real feedback from professionals who want to see you keep teaching. Build a reputation that gets you invited to write, mentor, and lead. Your ratings become your teaching CV.",
                            },
                            {
                                icon: Trophy,
                                accent: "text-rose-600",
                                title: "Mastery badges for expertise",
                                desc: "Complete any CPD activity in full and earn a mastery badge on your profile. It's the proof of clinical expertise for employers — a visible, verified marker that you know this material, not just that you clicked through it. Twelve badges means something. Fifty badges means something serious.",
                            },
                            {
                                icon: TrendingUp,
                                accent: "text-cyan-600",
                                title: "Track your growth in one timeline",
                                desc: "See your learning hours, CPD points, completions, and mastery badges in one continuous timeline. Know exactly where you stand for NCK licence renewal, job applications, or promotion. No more guessing if you've done enough this year. No more spreadsheets.",
                            },
                        ].map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="flex gap-3">
                                    <Icon className={`w-5 h-5 ${feature.accent} shrink-0 mt-0.5`} strokeWidth={2.2} />
                                    <div className="min-w-0">
                                        <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                                            {feature.title}
                                        </p>
                                        <p className="text-[12.5px] text-slate-500 leading-relaxed mt-1.5">
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS ═══════════════ */}
            <section id="how" className="w-full py-12 md:py-16 px-4 md:px-6 bg-slate-50">
                <div className="max-w-5xl mx-auto">

                    <div className="max-w-2xl mb-10">
                        <h2 className="text-[26px] md:text-4xl font-bold tracking-tighter text-slate-900 leading-tight">
                            Four steps to a living{" "}
                            <span className="text-emerald-600">CPD portfolio.</span>
                        </h2>
                        <p className="mt-3 text-[14px] md:text-[15px] text-slate-500 leading-relaxed">
                            Most nurses finish the whole setup in under 10 minutes. No paperwork,
                            no back-and-forth, no waiting weeks for a certificate to arrive in the post.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {[
                            {
                                n: "01",
                                title: "Create your account",
                                desc: "Sign up in 30 seconds with your NCK number and employer. Your profile becomes the home for every certificate you'll ever earn.",
                            },
                            {
                                n: "02",
                                title: "Get verified",
                                desc: "Upload your NCK licence and a recent employer letter. Our team reviews it in 2-3 days. Once approved, your verified contributor badge is permanent.",
                            },
                            {
                                n: "03",
                                title: "Earn CPD (or teach)",
                                desc: "Complete accredited activities from verified authors — every completion auto-generates a certificate with a verification code. Or publish your own activity and earn MedraeCoins per completion.",
                            },
                            {
                                n: "04",
                                title: "Renew without stress",
                                desc: "When NCK renewal season arrives, download your entire CPD history in one PDF. All certificates, all verification codes, all dates — in the format regulators accept.",
                            },
                        ].map((step, i) => (
                            <div key={i} className="flex gap-4">
                                <p className="shrink-0 text-[32px] md:text-[40px] font-bold text-emerald-600/30 tabular-nums leading-none">
                                    {step.n}
                                </p>
                                <div className="min-w-0">
                                    <p className="text-[14px] md:text-[15px] font-bold text-slate-900 leading-snug">
                                        {step.title}
                                    </p>
                                    <p className="text-[12.5px] text-slate-500 leading-relaxed mt-1.5">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ EARNING EXAMPLE ═══════════════ */}
            <section className="w-full py-12 md:py-16 px-4 md:px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-14 items-start">

                        <div>
                            <h2 className="text-[24px] md:text-3xl font-bold tracking-tighter text-slate-900 leading-tight">
                                What earning really looks like.
                            </h2>
                            <p className="mt-3 text-[14px] text-slate-500 leading-relaxed">
                                There's no complicated formula. Every time another nurse
                                completes one of your published CPD activities, you earn
                                20 MedraeCoins — the exact same number as the 20 CPD points
                                they earn. Simple, memorable, and scaleable.
                            </p>
                            <p className="mt-3 text-[14px] text-slate-500 leading-relaxed">
                                Redeem MedraeCoins for airtime, premium features, or cash
                                once you cross the minimum threshold. No expiry. No hidden
                                deductions. Your balance is always yours.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                Example — one published activity
                            </p>
                            <div className="space-y-2">
                                {[
                                    { label: "Nurses complete it this month", value: "10", sub: "200 MC · KSh 2" },
                                    { label: "Nurses complete it this year", value: "120", sub: "2,400 MC · KSh 24" },
                                    { label: "Nurses complete 3 activities this year", value: "360", sub: "7,200 MC · KSh 72" },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-baseline justify-between gap-3 py-3 border-b border-slate-200/70 last:border-b-0">
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-semibold text-slate-600">{row.label}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[16px] font-bold text-slate-900 tabular-nums leading-tight">{row.value}</p>
                                            <p className="text-[10px] text-emerald-600 font-bold tabular-nums">{row.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-500 pt-1">
                                Payout is illustrative — actual totals scale with how many nurses
                                complete each activity.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ FINAL CTA ═══════════════ */}
            <section id="cta" className="w-full py-14 md:py-20 px-4 md:px-6 bg-[#0d1117] text-white">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-[26px] md:text-4xl font-bold tracking-tight leading-tight">
                        Your nursing career,{" "}
                        <span className="text-emerald-400">organised.</span>
                    </h2>
                    <p className="mt-3 text-[13px] md:text-[14px] text-slate-400 leading-relaxed max-w-lg mx-auto">
                        Join thousands of Kenyan nurses building their CPD portfolio,
                        earning MedraeCoins, and stepping into teaching roles — all
                        from a single account that renews itself.
                    </p>
                    <button
                        onClick={() => nav("/register")}
                        className="mt-7 inline-flex items-center gap-2
                                   px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500
                                   text-white font-bold text-[14px]
                                   hover:scale-[1.02] active:scale-[0.97]
                                   transition-all duration-300"
                        style={{ touchAction: "manipulation" }}
                    >
                        Create free portfolio <ArrowRight className="w-4 h-4" />
                    </button>

                    <p className="mt-6 text-[12px] text-slate-500">
                        Wrong role?{" "}
                        <button
                            onClick={handleSwitchRole}
                            className="text-emerald-400 font-bold hover:underline"
                        >
                            Choose again
                        </button>
                    </p>
                </div>
            </section>
            <FloatingWhatsApp />
            <SiteFooter />
        </div>
    );
}