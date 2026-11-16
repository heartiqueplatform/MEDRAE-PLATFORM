// src/pages/landing/MedraeCoinsLanding.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Coins,
    ArrowRight,
    Sparkles,
    Heart,
    MessageCircle,
    Trophy,
    Swords,
    Gift,
    Wallet,
    Crown,
    Star,
    AlertCircle,
    ShieldCheck,
    Award,
    Users,
    BookOpen,
    TrendingUp,
    Clock,
    Ban,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
    MedraeCoinsTopNav,
    MedraeCoinsSidebarMobileTrigger,
    MedraeCoinsSidebarDrawer,
} from "@/components/index/MedraeCoinsSidebar";
import SiteFooter from "@/components/index/SiteFooter";
import { FloatingWhatsApp } from "@/components/index/FloatingWhatsApp";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type StudentConfig = {
    ksh_per_coin: number;
    min_redeem_coins: number;
    max_redeem_coins: number;
};

type StaffConfig = {
    coin_to_kes_rate: number;
    coins_per_completion: number;
    minimum_withdrawal: number;
};

type LiveState = {
    loading: boolean;
    loaded: boolean;
    student: StudentConfig | null;
    staff: StaffConfig | null;
};

/* ------------------------------------------------------------------ */
/*  Live rate hook — TWO economies, TWO tables                       */
/* ------------------------------------------------------------------ */

function useLiveCoins(): LiveState {
    const [state, setState] = useState<LiveState>({
        loading: true,
        loaded: false,
        student: null,
        staff: null,
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [stuRes, staffRes] = await Promise.all([
                    supabase
                        .from("medrae_stu_coin_config")
                        .select("ksh_per_coin, min_redeem_coins, max_redeem_coins")
                        .eq("id", 1)
                        .maybeSingle(),
                    supabase
                        .from("medrae_coin_config")
                        .select("coin_to_kes_rate, coins_per_completion, minimum_withdrawal")
                        .eq("id", 1)
                        .maybeSingle(),
                ]);

                if (cancelled) return;

                const student: StudentConfig | null = stuRes.data
                    ? {
                        ksh_per_coin: Number(stuRes.data.ksh_per_coin) || 0,
                        min_redeem_coins: Number(stuRes.data.min_redeem_coins) || 0,
                        max_redeem_coins: Number(stuRes.data.max_redeem_coins) || 0,
                    }
                    : null;

                const staff: StaffConfig | null = staffRes.data
                    ? {
                        coin_to_kes_rate: Number(staffRes.data.coin_to_kes_rate) || 0,
                        coins_per_completion:
                            Number(staffRes.data.coins_per_completion) || 0,
                        minimum_withdrawal:
                            Number(staffRes.data.minimum_withdrawal) || 0,
                    }
                    : null;

                setState({ loading: false, loaded: true, student, staff });
            } catch (err) {
                console.warn("[MedraeCoinsLanding] rate load failed:", err);
                if (!cancelled) {
                    setState({ loading: false, loaded: false, student: null, staff: null });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Hide page scrollbar while this landing is mounted
    useEffect(() => {
        const style = document.createElement("style");
        style.id = "hide-scrollbar-medrae-coins";
        style.textContent = `
        html::-webkit-scrollbar, body::-webkit-scrollbar {
            display: none !important; width: 0 !important; height: 0 !important;
        }
        html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    `;
        document.head.appendChild(style);
        return () => {
            document.getElementById("hide-scrollbar-medrae-coins")?.remove();
        };
    }, []);

    return state;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                        */
/* ------------------------------------------------------------------ */

function fmtKsh(amount: number): string {
    if (amount <= 0) return "unavailable";
    if (amount < 1) {
        return `KSh ${amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}`;
    }
    return `KSh ${amount.toLocaleString("en-KE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                 */
/* ------------------------------------------------------------------ */

function Section({
    icon: Icon,
    tone,
    eyebrow,
    title,
    children,
}: {
    icon: any;
    tone: string;
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl bg-white p-5 space-y-3.5 border border-slate-200/70">
            <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none mb-1">
                        {eyebrow}
                    </p>
                    <h2 className="text-[15px] font-bold text-slate-900 leading-tight">
                        {title}
                    </h2>
                </div>
            </div>
            <div className="space-y-3 text-[13.5px] leading-[1.7] text-slate-700">
                {children}
            </div>
        </section>
    );
}

function Bullet({
    icon: Icon,
    tone,
    children,
}: {
    icon: any;
    tone: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${tone}`}>
                <Icon className="w-3 h-3" />
            </div>
            <p className="flex-1 min-w-0 break-words">{children}</p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function MedraeCoinsLanding() {
    const nav = useNavigate();
    const state = useLiveCoins();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const studentRate = state.student?.ksh_per_coin ?? 0;
    const studentMin = state.student?.min_redeem_coins ?? 0;
    const staffRate = state.staff?.coin_to_kes_rate ?? 0;
    const staffPerCompletion = state.staff?.coins_per_completion ?? 0;
    const staffMinWithdraw = state.staff?.minimum_withdrawal ?? 0;

    const hasStudentRate = studentRate > 0;
    const hasStaffRate = staffRate > 0;

    return (
        <div className="min-h-screen w-full bg-slate-50 text-slate-900">
            <MedraeCoinsTopNav />
            <MedraeCoinsSidebarMobileTrigger onOpen={() => setDrawerOpen(true)} />
            <MedraeCoinsSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* Spacer for the fixed 64px top bar (desktop only) */}
            <div className="hidden lg:block h-16" aria-hidden />

            {/* ═══════════════ HERO ═══════════════ */}
            <section id="home" className="w-full px-4 md:px-6 pt-12 md:pt-20 pb-10 md:pb-14">
                <div className="max-w-3xl mx-auto text-center space-y-5">



                    <h1 className="text-[32px] sm:text-[44px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.08] text-slate-900">
                        Earn coins for what you already do.<br />
                        <span className="text-amber-600">
                            Spend them on what you love.
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-[15px] md:text-[16.5px] text-slate-600 leading-[1.75]">
                        MedraeCoins are Medrae's reward currency. <b className="text-slate-900">Students</b> earn
                        when other students engage with their posts — likes, comments, and quiz completions on
                        your content. <b className="text-slate-900">Staff</b> earn when nurses complete their
                        published CPD activities. Both can convert coins to cash, premium access, or bonus content.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
                        <button
                            onClick={() => nav("/register")}
                            className="inline-flex items-center justify-center gap-2
                                       px-6 py-3.5 rounded-xl
                                       bg-slate-900 hover:bg-slate-800
                                       text-white font-bold text-[14px]
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Start earning <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => nav("/login")}
                            className="inline-flex items-center justify-center gap-2
                                       px-6 py-3.5 rounded-xl
                                       bg-white border border-slate-200/80
                                       hover:bg-slate-50
                                       text-slate-700 font-bold text-[14px]
                                       active:scale-[0.97] transition-transform"
                            style={{ touchAction: "manipulation" }}
                        >
                            Sign in
                        </button>
                    </div>

                    {state.loading && (
                        <div className="inline-flex items-center gap-2 pt-4 text-[11px] text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading current coin rates…
                        </div>
                    )}

                    {!state.loading && !state.loaded && (
                        <div className="inline-block rounded-xl bg-amber-50 border border-amber-200/60 px-3 py-2 text-[11px] text-amber-800 leading-snug">
                            ⚠️ Live coin rates couldn't load — check your connection.
                        </div>
                    )}
                </div>
            </section>

            {/* ═══════════════ TWO PATHS ═══════════════ */}
            <section id="student-path" className="w-full px-4 md:px-6 pb-10 md:pb-14">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">

                    {/* STUDENT PATH */}
                    <div className="rounded-2xl bg-white border border-slate-200/70 p-5 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5" strokeWidth={2.4} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none mb-1">
                                    For students
                                </p>
                                <h3 className="text-[15px] font-bold leading-tight text-slate-900">
                                    Earn when others engage with you
                                </h3>
                            </div>
                        </div>

                        <p className="text-[13px] text-slate-600 leading-[1.7]">
                            When another student likes or comments on <b className="text-slate-900">your</b>{" "}
                            post, or completes a quiz <b className="text-slate-900">you</b> shared — you earn
                            coins. Not the person who clicked.{" "}
                            <b className="text-slate-900">You, the author.</b>
                        </p>

                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-500">1 coin =</span>
                                <span className="font-bold tabular-nums text-slate-900">
                                    {hasStudentRate ? fmtKsh(studentRate) : (
                                        <span className="italic text-slate-400">unavailable</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-500">Minimum redeem</span>
                                <span className="font-bold tabular-nums text-slate-900">
                                    {studentMin > 0 ? `${studentMin.toLocaleString()} coins` : (
                                        <span className="italic text-slate-400">unavailable</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-500">Cash-out via</span>
                                <span className="font-bold text-slate-900">MPesa B2C</span>
                            </div>
                        </div>

                        <button
                            onClick={() => nav("/register")}
                            className="w-full h-10 rounded-xl
                                       bg-blue-600 hover:bg-blue-700
                                       text-white text-[12px] font-bold
                                       active:scale-[0.97] transition-transform
                                       inline-flex items-center justify-center gap-1.5"
                            style={{ touchAction: "manipulation" }}
                        >
                            Apply as a student <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* STAFF PATH */}
                    <div className="rounded-2xl bg-white border border-slate-200/70 p-5 space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5" strokeWidth={2.4} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none mb-1">
                                    For staff
                                </p>
                                <h3 className="text-[15px] font-bold leading-tight text-slate-900">
                                    Earn when nurses complete your CPD
                                </h3>
                            </div>
                        </div>

                        <p className="text-[13px] text-slate-600 leading-[1.7]">
                            Publish a CPD activity once. Every nurse who completes it pays you coins —{" "}
                            <b className="text-slate-900">automatically, forever</b>. No per-student
                            negotiation.
                        </p>

                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-500">Per completion</span>
                                <span className="font-bold tabular-nums text-slate-900">
                                    {staffPerCompletion > 0 ? `${staffPerCompletion} coins` : (
                                        <span className="italic text-slate-400">unavailable</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-500">1 coin =</span>
                                <span className="font-bold tabular-nums text-slate-900">
                                    {hasStaffRate ? fmtKsh(staffRate) : (
                                        <span className="italic text-slate-400">unavailable</span>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                                <span className="text-slate-500">Minimum withdraw</span>
                                <span className="font-bold tabular-nums text-slate-900">
                                    {staffMinWithdraw > 0 ? `${staffMinWithdraw.toLocaleString()} coins` : (
                                        <span className="italic text-slate-400">unavailable</span>
                                    )}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => nav("/register")}
                            className="w-full h-10 rounded-xl
                                       bg-emerald-600 hover:bg-emerald-700
                                       text-white text-[12px] font-bold
                                       active:scale-[0.97] transition-transform
                                       inline-flex items-center justify-center gap-1.5"
                            style={{ touchAction: "manipulation" }}
                        >
                            Apply as a contributor <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </section>

            {/* ═══════════════ STUDENT DETAILS ═══════════════ */}
            <section id="student-details" className="w-full px-4 md:px-6 pb-10 md:pb-14">
                <div className="max-w-3xl mx-auto space-y-3">
                    <div className="text-center mb-5">
                        <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight text-slate-900">
                            How students earn
                        </h2>
                        <p className="mt-2 text-[13.5px] md:text-[14.5px] text-slate-500 leading-[1.7]">
                            You earn when <b>other students</b> engage with <b>your</b> content.
                        </p>
                    </div>

                    <Section
                        icon={Sparkles}
                        tone="text-blue-600 bg-blue-50"
                        eyebrow="Earning"
                        title="What pays you coins"
                    >
                        <p className="text-[13px] text-slate-600 leading-[1.7] pb-1">
                            Coins go to the <b className="text-slate-900">author</b> — the student whose
                            post or quiz was engaged with. Engaging with someone else's post doesn't earn
                            <i> you</i> coins; it earns <i>them</i>.
                        </p>
                        <Bullet icon={Heart} tone="text-rose-500 bg-rose-50">
                            <strong className="text-slate-900">Someone likes your post</strong> — you earn coins.
                        </Bullet>
                        <Bullet icon={MessageCircle} tone="text-blue-500 bg-blue-50">
                            <strong className="text-slate-900">Someone comments on your post</strong> — you earn coins.
                        </Bullet>
                        <Bullet icon={Trophy} tone="text-amber-500 bg-amber-50">
                            <strong className="text-slate-900">Someone completes a quiz you shared</strong>{" "}
                            — you earn coins once per unique student.
                        </Bullet>
                        <Bullet icon={Swords} tone="text-emerald-500 bg-emerald-50">
                            <strong className="text-slate-900">You win a peer challenge</strong> — you earn
                            bonus coins (this one <i>is</i> for you, because you did the work).
                        </Bullet>
                    </Section>

                    <Section
                        icon={Clock}
                        tone="text-amber-600 bg-amber-50"
                        eyebrow="Fair usage"
                        title="Daily limits"
                    >
                        <p>
                            To keep the economy fair, likes and comments paid to any one author have a daily
                            cap. Quizzes and challenges are uncapped, but each unique engagement pays only
                            once per student.
                        </p>
                    </Section>

                    <Section
                        icon={Gift}
                        tone="text-rose-600 bg-rose-50"
                        eyebrow="Cash-out"
                        title="What you can redeem"
                    >
                        <Bullet icon={Wallet} tone="text-teal-500 bg-teal-50">
                            <strong className="text-slate-900">Cash to MPesa:</strong>{" "}
                            {studentMin > 0 && hasStudentRate ? (
                                <>
                                    {studentMin.toLocaleString()} coins minimum →{" "}
                                    {fmtKsh(studentMin * studentRate)}. Processed within 24 hours.
                                </>
                            ) : (
                                <span className="italic text-slate-400">
                                    minimum redemption unavailable — check back online.
                                </span>
                            )}
                        </Bullet>
                        <Bullet icon={Crown} tone="text-amber-500 bg-amber-50">
                            <strong className="text-slate-900">Premium access:</strong> Unlock premium quizzes
                            and content.
                        </Bullet>
                        <Bullet icon={Star} tone="text-violet-500 bg-violet-50">
                            <strong className="text-slate-900">Bonus content:</strong> Exclusive quiz packs.
                        </Bullet>
                    </Section>
                </div>
            </section>

            {/* ═══════════════ STAFF DETAILS ═══════════════ */}
            <section id="staff-details" className="w-full px-4 md:px-6 pb-10 md:pb-14">
                <div className="max-w-3xl mx-auto space-y-3">
                    <div className="text-center mb-5">
                        <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight text-slate-900">
                            How staff earn
                        </h2>
                        <p className="mt-2 text-[13.5px] md:text-[14.5px] text-slate-500 leading-[1.7]">
                            Publish once. Earn forever. Every completion pays you.
                        </p>
                    </div>

                    <Section
                        icon={Award}
                        tone="text-emerald-600 bg-emerald-50"
                        eyebrow="Earning"
                        title="Per verified CPD completion"
                    >
                        <p>
                            Every nurse who enrolls in one of your published CPD activities and completes
                            it pays you{" "}
                            <strong className="text-slate-900">
                                {staffPerCompletion > 0
                                    ? `${staffPerCompletion} MedraeCoins`
                                    : "a fixed number of MedraeCoins"}
                            </strong>
                            . The rate is set by Medrae admins and shown live above when you're online.
                        </p>
                    </Section>

                    <Section
                        icon={TrendingUp}
                        tone="text-violet-600 bg-violet-50"
                        eyebrow="Conversion"
                        title="Coins to cash"
                    >
                        <p>
                            Convert your accumulated coins to KES at the live rate. Minimum withdrawal
                            is{" "}
                            <strong className="text-slate-900">
                                {staffMinWithdraw > 0
                                    ? `${staffMinWithdraw.toLocaleString()} coins`
                                    : "shown when you're online"}
                            </strong>
                            . Payouts are processed via bank transfer or MPesa, depending on your region.
                        </p>
                    </Section>

                    <Section
                        icon={ShieldCheck}
                        tone="text-emerald-600 bg-emerald-50"
                        eyebrow="Requirements"
                        title="Becoming a contributor"
                    >
                        <Bullet icon={CheckCircle2} tone="text-emerald-500 bg-emerald-50">
                            <strong className="text-slate-900">Verified nurse:</strong> Active license
                            and professional standing.
                        </Bullet>
                        <Bullet icon={BookOpen} tone="text-blue-500 bg-blue-50">
                            <strong className="text-slate-900">Publish quality CPD:</strong> Content
                            reviewed by Medrae's editorial team.
                        </Bullet>
                        <Bullet icon={Users} tone="text-violet-500 bg-violet-50">
                            <strong className="text-slate-900">Keep it updated:</strong> Outdated
                            content is depublished and stops earning.
                        </Bullet>
                    </Section>
                </div>
            </section>

            {/* ═══════════════ ANTI-ABUSE ═══════════════ */}
            <section id="anti-abuse" className="w-full px-4 md:px-6 pb-10 md:pb-14">
                <div className="max-w-3xl mx-auto">
                    <Section
                        icon={Ban}
                        tone="text-rose-600 bg-rose-50"
                        eyebrow="Ground rules"
                        title="Anti-abuse policy"
                    >
                        <p>
                            Any of the following results in suspension of earning privileges, forfeiture
                            of coins, and potentially account-level action:
                        </p>
                        <Bullet icon={AlertCircle} tone="text-rose-500 bg-rose-50">
                            <strong className="text-slate-900">Self-engagement:</strong> liking,
                            commenting, or bookmarking your own content.
                        </Bullet>
                        <Bullet icon={AlertCircle} tone="text-rose-500 bg-rose-50">
                            <strong className="text-slate-900">Bot activity:</strong> automated likes,
                            comments, or quiz attempts.
                        </Bullet>
                        <Bullet icon={AlertCircle} tone="text-rose-500 bg-rose-50">
                            <strong className="text-slate-900">Multi-accounting:</strong> one account
                            per student/contributor. Permanent ban.
                        </Bullet>
                        <Bullet icon={AlertCircle} tone="text-rose-500 bg-rose-50">
                            <strong className="text-slate-900">Reciprocal rings:</strong> artificially
                            liking or commenting in groups.
                        </Bullet>
                    </Section>
                </div>
            </section>

            {/* ═══════════════ CTA ═══════════════ */}
            <section id="cta" className="w-full px-4 md:px-6 pb-16 md:pb-24">
                <div className="max-w-2xl mx-auto text-center space-y-4">
                    <h2 className="text-[24px] md:text-[34px] font-bold tracking-tight leading-tight text-slate-900">
                        Ready to start earning?
                    </h2>
                    <p className="text-[13.5px] md:text-[14.5px] text-slate-500 leading-[1.7] max-w-lg mx-auto">
                        Students earn when others engage with their content. Staff earn when nurses
                        complete their CPD. Both paths start with one sign-up.
                    </p>
                    <button
                        onClick={() => nav("/register")}
                        className="inline-flex items-center gap-2
                                   px-7 py-3.5 rounded-xl
                                   bg-slate-900 hover:bg-slate-800
                                   text-white font-bold text-[14px]
                                   active:scale-[0.97] transition-transform"
                        style={{ touchAction: "manipulation" }}
                    >
                        Create your account <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </section>

            <FloatingWhatsApp />
            {/* 🆕 Footer — extracted component */}
            <SiteFooter />
        </div>
    );
}