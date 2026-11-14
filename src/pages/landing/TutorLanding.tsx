// src/pages/landing/TutorLanding.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight, Users, Shield, BarChart3, ClipboardList, Clock, CheckCircle2,
    FileText, TrendingUp, Send, Target, Layers, Eye, Lock,
} from "lucide-react";
import {
    TutorTopNav,
    TutorSidebarMobileTrigger,
    TutorSidebarDrawer,
} from "@/components/index/TutorSidebar";
import SiteFooter from "@/components/index/SiteFooter";
import { FloatingWhatsApp } from "@/components/index/FloatingWhatsApp";

export default function TutorLanding() {
    const nav = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Hide page scrollbar while this landing is mounted
    useEffect(() => {
        const style = document.createElement("style");
        style.id = "hide-scrollbar-tutor-landing";
        style.textContent = `
            html::-webkit-scrollbar,
            body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
            html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        `;
        document.head.appendChild(style);
        return () => {
            document.getElementById("hide-scrollbar-tutor-landing")?.remove();
        };
    }, []);

    return (
        <div className="min-h-screen w-full overflow-x-hidden relative bg-slate-50">

            {/* Desktop: top nav. Mobile: trigger → drawer */}
            <TutorTopNav />
            <TutorSidebarMobileTrigger onOpen={() => setDrawerOpen(true)} />
            <TutorSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* Spacer for the fixed 64px top bar (desktop only) */}
            <div className="hidden lg:block h-16" aria-hidden />

            {/* ═══════════════ HERO ═══════════════ */}
            <section id="home" className="relative w-full py-12 md:py-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-14 items-center">

                    {/* LEFT — headline + CTA */}
                    <div>
                        <h1 className="text-[34px] sm:text-5xl md:text-6xl font-bold tracking-[-0.03em] leading-[1.02] text-slate-900">
                            Run your exams.<br />
                            <span className="text-violet-600">Digitally. Securely. Fast.</span>
                        </h1>

                        <p className="mt-5 text-[15px] md:text-[16px] text-slate-600 max-w-xl leading-relaxed">
                            Set the assignment. Send it to your cohort. Watch every student's
                            progress in real time. The system marks the papers, ranks the class,
                            and shows you exactly which topics need re-teaching — before the next
                            lecture, not after the term ends.
                        </p>

                        <div className="mt-7 flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => nav("/register")}
                                className="inline-flex items-center justify-center gap-2
                                           px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500
                                           text-white font-bold text-[14px]
                                           hover:scale-[1.02] active:scale-[0.97]
                                           transition-all duration-300"
                                style={{ touchAction: "manipulation" }}
                            >
                                Start free trial <ArrowRight className="w-4 h-4" />
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
                                onClick={() => {
                                    localStorage.removeItem("medrae.persona");
                                    sessionStorage.removeItem("medrae.seen_chooser");
                                    nav("/");
                                }}
                                className="text-violet-600 font-bold hover:underline"
                            >
                                Choose again
                            </button>
                        </p>
                    </div>

                    {/* RIGHT — cohort at-a-glance stat block, no card */}
                    <div className="lg:pl-8 lg:border-l border-slate-200/70 pt-8 lg:pt-0 border-t lg:border-t-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                            Your cohort at a glance
                        </p>

                        <div className="space-y-4">
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <p className="text-[56px] md:text-[72px] font-bold text-slate-900 tabular-nums leading-none tracking-tighter">
                                        12
                                    </p>
                                    <span className="text-[24px] font-bold text-violet-600 leading-none">
                                        hrs
                                    </span>
                                </div>
                                <p className="text-[13px] text-slate-500 mt-1.5">
                                    from submission to released results across the entire cohort.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-slate-200/70 space-y-2.5">
                                {[
                                    { label: "Exams you can run per term", value: "Unlimited" },
                                    { label: "Students per cohort", value: "No limit" },
                                    { label: "Per-student cost", value: "Zero" },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-baseline justify-between gap-3">
                                        <span className="text-[12px] font-semibold text-slate-500">{row.label}</span>
                                        <span className="text-[14px] font-bold text-slate-900 tabular-nums">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ HOW TUTORS ASSIGN + TRACK ═══════════════ */}
            <section id="features" className="w-full py-12 md:py-16 px-4 md:px-6 bg-white">
                <div className="max-w-6xl mx-auto">

                    <div className="max-w-2xl mb-10">
                        <h2 className="text-[26px] md:text-4xl font-bold tracking-tighter text-slate-900 leading-tight">
                            Set the assignment.{" "}
                            <span className="text-violet-600">Watch it unfold.</span>
                        </h2>
                        <p className="mt-3 text-[14px] md:text-[15px] text-slate-500 leading-relaxed">
                            Every tutor's real job isn't marking papers — it's knowing which students
                            are ready for the ward and which ones need one more week on the fundamentals.
                            Medrae turns marking into insight so you can focus on teaching.
                        </p>
                    </div>

                    {/* Two-column paragraph list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {[
                            {
                                icon: ClipboardList,
                                accent: "text-violet-600",
                                title: "Upload once. Send to any cohort.",
                                desc: "Upload a question bank — CATs, mocks, end-of-term, or internal assignments — once. Reuse it every term, every intake, every class. Auto-shuffle the questions per student so no two papers are ever identical. No more printing 60 different versions of the same exam.",
                            },
                            {
                                icon: Send,
                                accent: "text-blue-600",
                                title: "Assign in one click. Auto-notify.",
                                desc: "Pick the exam, pick the cohort, set the deadline, hit send. Every student gets an in-app notification with the exam link and a clear countdown. No more email chains, no more WhatsApp reminders, no more students claiming they didn't see the message.",
                            },
                            {
                                icon: Lock,
                                accent: "text-rose-600",
                                title: "Full DigiProctor lockdown.",
                                desc: "The moment a student starts the exam, their browser locks to full-screen. Tab-switching, copy-paste, and background apps are all blocked. Just like the real NCK computer-based test — so what you're grading is what your students actually know, not what they can Google.",
                            },
                            {
                                icon: BarChart3,
                                accent: "text-emerald-600",
                                title: "Watch the class in real time.",
                                desc: "See the live dashboard: who's submitted, who's halfway through, who hasn't started. Spot the student who finished in 4 minutes (suspicious) and the one still working at the 90-minute mark (needs help). Every data point is there the moment it happens.",
                            },
                            {
                                icon: TrendingUp,
                                accent: "text-amber-600",
                                title: "Rank by student, question, or topic.",
                                desc: "Instantly see who's top of the class, who's failing, which questions 80% of the cohort got wrong, and which topics need to be re-taught next week. Export the analytics as PDF for departmental reviews, or send parents a report card in one click.",
                            },
                            {
                                icon: Eye,
                                accent: "text-cyan-600",
                                title: "Release results when you're ready.",
                                desc: "Nobody sees their score until you click release. Review every submission, override any mark you disagree with, add feedback notes — then push results to the whole cohort at once. No students finishing early and spoiling the curve for everyone else.",
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

            {/* ═══════════════ WORKFLOW: 4 STEPS ═══════════════ */}
            <section id="how" className="w-full py-12 md:py-16 px-4 md:px-6 bg-slate-50">
                <div className="max-w-5xl mx-auto">

                    <div className="max-w-2xl mb-10">
                        <h2 className="text-[26px] md:text-4xl font-bold tracking-tighter text-slate-900 leading-tight">
                            From question bank to released results —{" "}
                            <span className="text-violet-600">in four steps.</span>
                        </h2>
                        <p className="mt-3 text-[14px] md:text-[15px] text-slate-500 leading-relaxed">
                            No training required. If you can upload a file and click a button,
                            you can run a Medrae exam.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {[
                            {
                                n: "01",
                                title: "Upload your question bank",
                                desc: "Import from a spreadsheet or add questions manually. Tag each one by topic and difficulty. Set the pass mark, the time limit, and the attempt cap — the system handles the rest.",
                            },
                            {
                                n: "02",
                                title: "Create the exam",
                                desc: "Pick the questions you want (or let Medrae auto-select a balanced set). Choose the shuffle rules, the window, the attempt limit. Lock it with DigiProctor mode if you want a strict test, or leave it open for practice.",
                            },
                            {
                                n: "03",
                                title: "Assign to the cohort",
                                desc: "Choose the class, the year group, or a custom list of students. Set the deadline. Hit send. Every student gets the notification instantly — and the countdown starts ticking on your dashboard.",
                            },
                            {
                                n: "04",
                                title: "Review, release, learn",
                                desc: "Watch live progress, auto-grading completes the moment each student submits. Review flagged submissions, override any marks, then release to the whole cohort. Analytics are ready before you close your laptop.",
                            },
                        ].map((step, i) => (
                            <div key={i} className="flex gap-4">
                                <p className="shrink-0 text-[32px] md:text-[40px] font-bold text-violet-600/30 tabular-nums leading-none">
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

            {/* ═══════════════ WHAT TUTORS ACTUALLY SEE ═══════════════ */}
            <section className="w-full py-12 md:py-16 px-4 md:px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-14 items-start">

                        <div>
                            <h2 className="text-[24px] md:text-3xl font-bold tracking-tighter text-slate-900 leading-tight">
                                What a Medrae exam actually looks like from your side.
                            </h2>
                            <p className="mt-3 text-[14px] text-slate-500 leading-relaxed">
                                Every submission is a data point. Every wrong answer is a teaching
                                opportunity. Every struggling student is a signal that you need to
                                intervene — if you can see it before the term ends. Medrae makes
                                it visible.
                            </p>
                            <p className="mt-3 text-[14px] text-slate-500 leading-relaxed">
                                You don't need to export anything to a spreadsheet, run formulas
                                in Excel, or build a dashboard yourself. The moment the exam closes,
                                the reports are already there — ready to share with a head of
                                department, a parent, or a student who needs to see exactly where
                                they stand.
                            </p>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
                                The analytics you get
                            </p>
                            <div className="space-y-3">
                                {[
                                    { icon: Target, label: "Class average vs. top scorer vs. bottom quartile", value: "At a glance" },
                                    { icon: FileText, label: "Per-question pass rate across the whole cohort", value: "Live" },
                                    { icon: Layers, label: "Topic-level mastery breakdown", value: "Per unit" },
                                    { icon: Clock, label: "Time-to-completion per student (flag outliers)", value: "Tracked" },
                                    { icon: CheckCircle2, label: "Auto-graded submissions ready to release", value: "Instantly" },
                                    { icon: Shield, label: "Suspicious-pattern flags on lockdown violations", value: "Flagged" },
                                ].map((row, i) => {
                                    const Icon = row.icon;
                                    return (
                                        <div key={i} className="flex items-start gap-3 py-3 border-b border-slate-200/70 last:border-b-0">
                                            <Icon className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" strokeWidth={2.2} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12.5px] font-semibold text-slate-700 leading-snug">
                                                    {row.label}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 shrink-0">
                                                {row.value}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ FINAL CTA ═══════════════ */}
            <section id="cta" className="w-full py-14 md:py-20 px-4 md:px-6 bg-[#0d1117] text-white">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-[26px] md:text-4xl font-bold tracking-tight leading-tight">
                        Ready to digitise{" "}
                        <span className="text-violet-400">your exams?</span>
                    </h2>
                    <p className="mt-3 text-[13px] md:text-[14px] text-slate-400 leading-relaxed max-w-lg mx-auto">
                        Affordable institutional hosting. No per-student fees. Full analytics
                        on every submission. Free trial — no credit card required.
                    </p>
                    <button
                        onClick={() => nav("/register")}
                        className="mt-7 inline-flex items-center gap-2
                                   px-7 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500
                                   text-white font-bold text-[14px]
                                   hover:scale-[1.02] active:scale-[0.97]
                                   transition-all duration-300"
                        style={{ touchAction: "manipulation" }}
                    >
                        Start free trial <ArrowRight className="w-4 h-4" />
                    </button>

                    <p className="mt-6 text-[12px] text-slate-500">
                        Wrong role?{" "}
                        <button
                            onClick={() => {
                                localStorage.removeItem("medrae.persona");
                                sessionStorage.removeItem("medrae.seen_chooser");
                                nav("/");
                            }}
                            className="text-violet-400 font-bold hover:underline"
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