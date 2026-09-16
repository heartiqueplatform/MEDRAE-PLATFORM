import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
    Trophy,
    Award,
    GraduationCap,
    Stethoscope,
    ShieldCheck,
    BookOpenCheck,
    FileCheck2,
    ClipboardList,
    ListChecks,
    BarChart3,
    Users,
    Calendar,
    MapPin,
    Clock,
    BadgeCheck,
    HeartPulse,
    Sparkles,
    ArrowRight,
} from "lucide-react";
import SeoFooter from "./SeoFooter";

/**
 * Public landing page: Medrae National Nursing Merit Cup
 * Route: /medrae-nursing-merit-cup
 * Static content only. No Supabase, no data fetching.
 */
export default function MedraeNursingMeritCupPage() {
    useEffect(() => {
        const SITE_URL = "https://medrae.vercel.app";
        const PAGE_PATH = "/medrae-nursing-merit-cup";
        const CANONICAL = `${SITE_URL}${PAGE_PATH}`;

        const prevTitle = document.title;
        document.title =
            "Medrae National Nursing Merit Cup | Kenya's Nursing Excellence Olympiad";

        const setMeta = (
            attr: "name" | "property",
            key: string,
            content: string
        ) => {
            let el = document.head.querySelector<HTMLMetaElement>(
                `meta[${attr}="${key}"]`
            );
            if (!el) {
                el = document.createElement("meta");
                el.setAttribute(attr, key);
                document.head.appendChild(el);
            }
            el.setAttribute("content", content);
        };

        setMeta(
            "name",
            "description",
            "Medrae National Nursing Merit Cup ~ Kenya's first nationwide nursing excellence olympiad. A merit-based academic competition for KMTC students, interns, and staff nurses. Merit awards, CPD, certificate for all participants. Entry: KSh 999 students, KSh 1,499 staff."
        );
        setMeta(
            "property",
            "og:title",
            "Medrae National Nursing Merit Cup | Kenya's Nursing Excellence Olympiad"
        );
        setMeta(
            "property",
            "og:description",
            "A 2-month academic program + final merit exam for Kenyan nursing students and staff. Merit awards, CPD, and certificate for all participants."
        );
        setMeta("property", "og:type", "article");
        setMeta("property", "og:url", CANONICAL);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta(
            "name",
            "twitter:title",
            "Medrae National Nursing Merit Cup"
        );
        setMeta(
            "name",
            "twitter:description",
            "Kenya's first nationwide nursing excellence olympiad. Merit-based academic competition. Certificate for all participants."
        );

        let canonical = document.head.querySelector<HTMLLinkElement>(
            'link[rel="canonical"]'
        );
        if (!canonical) {
            canonical = document.createElement("link");
            canonical.setAttribute("rel", "canonical");
            document.head.appendChild(canonical);
        }
        canonical.setAttribute("href", CANONICAL);

        return () => {
            document.title = prevTitle;
        };
    }, []);

    return (
        <main className="flex min-h-screen w-full flex-col items-center bg-white text-slate-800">
            <article className="w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
                {/* ============ Brand Header ============ */}
                <div className="mb-8 flex flex-col items-center text-center">
                    <img
                        src="/pwa-512x512.png"
                        alt="Medrae Nursing"
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-contain shadow-sm"
                    />
                    <p className="mt-3 text-sm font-bold tracking-tight sm:text-base">
                        <span className="text-red-600">MEDRAE</span>
                        <span className="text-slate-800 ml-1">NURSING</span>
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500 sm:text-sm">
                        National Nursing Merit Cup
                    </p>
                </div>

                {/* ============ HERO ============ */}
                <section className="text-center">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
                        Medrae National Nursing{" "}
                        <span className="text-blue-700">Merit Cup</span>
                    </h1>
                    <p className="mt-3 text-base font-medium text-slate-600 sm:text-xl">
                        Kenya&rsquo;s First Nationwide Nursing Excellence
                        Olympiad
                    </p>

                    <p className="mt-6 text-[15px] leading-7 text-slate-600 sm:text-base">
                        A two-month academic program that builds you into a
                        stronger nurse ~ then crowns the top performers in a
                        national merit ranking. Modelled on academic
                        competitions like the Kenya Science and Engineering
                        Fair. A pursuit of excellence in the spirit of Florence
                        Nightingale.
                    </p>

                    {/* Meta row */}
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-slate-600 sm:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-blue-700" />
                            <strong className="font-semibold text-slate-900">
                                Format:
                            </strong>{" "}
                            Online + Final in Nairobi
                        </span>
                        <span className="hidden text-slate-300 sm:inline">
                            •
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-blue-700" />
                            <strong className="font-semibold text-slate-900">
                                Frequency:
                            </strong>{" "}
                            Two Cups per year
                        </span>
                        <span className="hidden text-slate-300 sm:inline">
                            •
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-blue-700" />
                            <strong className="font-semibold text-slate-900">
                                Duration:
                            </strong>{" "}
                            8 Weeks
                        </span>
                    </div>

                    {/* CTAs */}
                    <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <Link
                            to="/register"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:w-auto sm:text-base"
                        >
                            Register as Student ~ KSh 999
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-sm font-bold text-blue-700 ring-1 ring-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:w-auto sm:text-base"
                        >
                            Register as Staff Nurse ~ KSh 1,499
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 sm:text-sm">
                        Limited to <strong>600 slots per Cup</strong>.
                        Registration opens soon.
                    </p>
                </section>

                {/* ============ WHAT IS IT ============ */}
                <section className="mt-16">
                    <div className="flex items-center gap-3">
                        <BookOpenCheck className="h-6 w-6 text-blue-700" />
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            What Is the Medrae Nursing Merit Cup?
                        </h2>
                    </div>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-700 sm:text-base">
                        <p>
                            The Medrae National Nursing Merit Cup is a
                            nationally recognised{" "}
                            <strong>academic olympiad</strong> for Kenyan
                            nursing students and practising nurses. It rewards
                            study, skill, and merit ~ never chance.
                        </p>
                        <p>
                            Think of it as Kenya&rsquo;s Science Congress or
                            Music Festival, but for nursing excellence. It
                            exists to push the standard of nursing knowledge,
                            celebrate top performers, and give every
                            participant a reason to study consistently for two
                            months.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <div className="flex items-center gap-2">
                                <ListChecks className="h-5 w-5 text-blue-700" />
                                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                    How the Programme Runs
                                </h3>
                            </div>
                            <ul className="mt-3 space-y-2 pl-5 text-slate-700">
                                <li className="list-disc">
                                    <strong>8-week academic program</strong> ~
                                    daily quizzes, structured revision, three
                                    mock NCK-style exams.
                                </li>
                                <li className="list-disc">
                                    <strong>Final Merit Exam</strong> ~ a
                                    supervised online examination that
                                    determines national ranking.
                                </li>
                                <li className="list-disc">
                                    <strong>Merit Award Ceremony</strong> ~
                                    trophies, certificates, CPD recognition,
                                    and public acknowledgement of top
                                    performers.
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <div className="flex items-center gap-2">
                                <FileCheck2 className="h-5 w-5 text-blue-700" />
                                <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                    What Your Entry Fee Covers
                                </h3>
                            </div>
                            <p className="mt-2 text-slate-700">
                                Every shilling of your entry fee goes to
                                education services ~ the study pack, exam
                                marking, certificates, and premium access.
                            </p>
                            <ul className="mt-3 space-y-2 pl-5 text-slate-700">
                                <li className="list-disc">
                                    2 months of Medrae Premium access
                                </li>
                                <li className="list-disc">
                                    Full study pack for the Cup
                                </li>
                                <li className="list-disc">
                                    Three mock NCK-style exams
                                </li>
                                <li className="list-disc">
                                    Exam marking and merit ranking
                                </li>
                                <li className="list-disc">
                                    Certificate of Participation
                                </li>
                                <li className="list-disc">
                                    For staff nurses: CPD points and CPD
                                    certificate
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ============ WHO CAN JOIN ============ */}
                <section className="mt-16">
                    <div className="flex items-center gap-3">
                        <Users className="h-6 w-6 text-blue-700" />
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            Who Can Join
                        </h2>
                    </div>
                    <p className="mt-4 text-[15px] leading-7 text-slate-700 sm:text-base">
                        The Merit Cup is open to three categories of nursing
                        professionals in Kenya. Students and interns join the
                        same category. Staff nurses and tutors compete
                        separately.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <GraduationCap className="h-6 w-6 text-blue-700" />
                            <h3 className="mt-3 text-base font-bold text-slate-900">
                                KMTC Student
                            </h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                                Year 1–3
                            </p>
                            <p className="mt-3 text-[14px] leading-7 text-slate-600">
                                Any registered nursing student in a KMTC or
                                NCK-accredited diploma programme.
                            </p>
                            <p className="mt-4 text-2xl font-black text-slate-900">
                                KSh 999
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <Stethoscope className="h-6 w-6 text-blue-700" />
                            <h3 className="mt-3 text-base font-bold text-slate-900">
                                Intern / New Graduate
                            </h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                                Post-Graduation
                            </p>
                            <p className="mt-3 text-[14px] leading-7 text-slate-600">
                                Nurses in internship or within their first
                                year of practice preparing for the NCK exam.
                            </p>
                            <p className="mt-4 text-2xl font-black text-slate-900">
                                KSh 999
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <BadgeCheck className="h-6 w-6 text-blue-700" />
                            <h3 className="mt-3 text-base font-bold text-slate-900">
                                Staff Nurse / Tutor
                            </h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                                CPD Points Included
                            </p>
                            <p className="mt-3 text-[14px] leading-7 text-slate-600">
                                Practising nurses and tutors who want to
                                benchmark their knowledge and earn CPD
                                recognition.
                            </p>
                            <p className="mt-4 text-2xl font-black text-slate-900">
                                KSh 1,499
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ WHAT YOU GET ============ */}
                <section className="mt-16">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 text-blue-700" />
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            What Every Participant Gets
                        </h2>
                    </div>
                    <p className="mt-4 text-[15px] leading-7 text-slate-700 sm:text-base">
                        Whether you rank first or last, your entry gives you
                        real academic value.
                    </p>

                    <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <li className="rounded-lg bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-700" />
                                <p className="font-bold text-slate-900">
                                    2 Months Medrae Premium
                                </p>
                            </div>
                            <p className="mt-2 text-[13px] text-slate-600">
                                Full access to NCK-style questions, notes,
                                flashcards, and DigiProctor simulations.
                            </p>
                        </li>
                        <li className="rounded-lg bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-blue-700" />
                                <p className="font-bold text-slate-900">
                                    3 Mock NCK Exams
                                </p>
                            </div>
                            <p className="mt-2 text-[13px] text-slate-600">
                                Realistic, timed, and marked ~ to prepare you
                                for the pressure of the NCK exam.
                            </p>
                        </li>
                        <li className="rounded-lg bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-blue-700" />
                                <p className="font-bold text-slate-900">
                                    Certificate of Participation
                                </p>
                            </div>
                            <p className="mt-2 text-[13px] text-slate-600">
                                A formal certificate recognising your
                                commitment to academic excellence.
                            </p>
                        </li>
                        <li className="rounded-lg bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-blue-700" />
                                <p className="font-bold text-slate-900">
                                    Daily Quizzes &amp; Leaderboard
                                </p>
                            </div>
                            <p className="mt-2 text-[13px] text-slate-600">
                                Keep a daily streak, climb the national
                                leaderboard, and stay motivated.
                            </p>
                        </li>
                        <li className="rounded-lg bg-slate-50 p-4 sm:col-span-2">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-blue-700" />
                                <p className="font-bold text-slate-900">
                                    Final Merit Ranking
                                </p>
                            </div>
                            <p className="mt-2 text-[13px] text-slate-600">
                                A national ranking based purely on exam
                                performance ~ a credible, verifiable academic
                                achievement you can list on your CV.
                            </p>
                        </li>
                    </ul>
                </section>

                {/* ============ MERIT AWARDS ============ */}
                <section className="mt-16">
                    <div className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-blue-700" />
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            Merit Awards &amp; Recognition
                        </h2>
                    </div>
                    <p className="mt-4 text-[15px] leading-7 text-slate-700 sm:text-base">
                        The Cup awards <strong>fixed merit prizes</strong>{" "}
                        based purely on final exam ranking. These are academic
                        merit awards ~ not a pool, not a percentage of fees,
                        and not a chance draw. Every participant still receives
                        the full study pack, 2 months Premium, and a
                        Certificate of Participation.
                    </p>

                    {/* Student category cash awards */}
                    <div className="mt-6">
                        <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                            Students &amp; Interns Category ~ Cash Merit Awards
                        </h3>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-blue-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                                    1st Place
                                </p>
                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    KSh 12,000
                                </p>
                                <p className="mt-1 text-[12px] text-slate-600">
                                    Cash Merit Award
                                </p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                                    2nd Place
                                </p>
                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    KSh 8,000
                                </p>
                                <p className="mt-1 text-[12px] text-slate-600">
                                    Cash Merit Award
                                </p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                                    3rd Place
                                </p>
                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    KSh 6,000
                                </p>
                                <p className="mt-1 text-[12px] text-slate-600">
                                    Cash Merit Award
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Staff category cash awards */}
                    <div className="mt-8">
                        <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                            Staff Nurses &amp; Tutors Category ~ Cash Merit
                            Awards
                        </h3>
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-blue-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                                    1st Place
                                </p>
                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    KSh 16,000
                                </p>
                                <p className="mt-1 text-[12px] text-slate-600">
                                    Cash Merit Award
                                </p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                                    2nd Place
                                </p>
                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    KSh 12,000
                                </p>
                                <p className="mt-1 text-[12px] text-slate-600">
                                    Cash Merit Award
                                </p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
                                    3rd Place
                                </p>
                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    KSh 10,000
                                </p>
                                <p className="mt-1 text-[12px] text-slate-600">
                                    Cash Merit Award
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional recognition */}
                    <div className="mt-8 space-y-4">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-blue-700" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                                    Top 3 Nationally ~ Additional Recognition
                                </p>
                            </div>
                            <ul className="mt-3 space-y-3 text-[14px] leading-7 text-slate-700">
                                <li className="flex items-start gap-3">
                                    <Trophy className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>Nightingale Trophy</strong> ~
                                        engraved and awarded at the ceremony
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>
                                            6 Months Medrae Premium
                                        </strong>{" "}
                                        ~ free
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <BookOpenCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>Paid CPD Workshop</strong> ~
                                        fully sponsored attendance
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>LinkedIn Feature</strong> on
                                        Medrae&rsquo;s official page
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <FileCheck2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>Recommendation Letter</strong>{" "}
                                        from Medrae Leadership
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-blue-700" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                                    Top 10 Nationally
                                </p>
                            </div>
                            <ul className="mt-3 space-y-3 text-[14px] leading-7 text-slate-700">
                                <li className="flex items-start gap-3">
                                    <Award className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>Excellence Certificate</strong>{" "}
                                        ~ signed and verifiable
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>Medrae Hall of Fame</strong> ~
                                        permanent feature on our platform
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <div className="flex items-center gap-2">
                                <FileCheck2 className="h-5 w-5 text-blue-700" />
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
                                    Top 50 Nationally
                                </p>
                            </div>
                            <ul className="mt-3 space-y-3 text-[14px] leading-7 text-slate-700">
                                <li className="flex items-start gap-3">
                                    <FileCheck2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                    <span>
                                        <strong>Merit Certificate</strong> ~
                                        recognising national ranking
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ============ HOW IT WORKS ============ */}
                <section className="mt-16">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-6 w-6 text-blue-700" />
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            How It Works
                        </h2>
                    </div>

                    <ol className="mt-6 space-y-4">
                        <li className="rounded-xl bg-slate-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                                Weeks 1–6
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-900">
                                Study &amp; Daily Practice
                            </p>
                            <p className="mt-2 text-[14px] leading-7 text-slate-600">
                                Study on Medrae every day. Complete the daily
                                quizzes, work through mock NCK exams, and
                                build your leaderboard position.
                            </p>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                                Week 7
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-900">
                                Online Merit Exam
                            </p>
                            <p className="mt-2 text-[14px] leading-7 text-slate-600">
                                Sit the supervised national merit exam from
                                anywhere in Kenya. This determines your final
                                ranking.
                            </p>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-5">
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                                Week 8
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-900">
                                Results &amp; Award Ceremony
                            </p>
                            <p className="mt-2 text-[14px] leading-7 text-slate-600">
                                Live online ceremony. Certificates released,
                                trophies shipped to top performers, cash merit
                                awards disbursed, and the National Merit
                                Ranking published.
                            </p>
                        </li>
                    </ol>
                </section>

                {/* ============ TRUST ============ */}
                <section className="mt-16 rounded-2xl bg-blue-50 p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-blue-800" />
                        <h2 className="text-xl font-bold text-blue-900 sm:text-2xl">
                            Academic, Transparent, and Merit-Based
                        </h2>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <div>
                            <p className="text-2xl font-black text-blue-900">
                                500+
                            </p>
                            <p className="text-[13px] font-medium text-blue-800">
                                Nursing students already trust Medrae
                            </p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-blue-900">
                                Fixed
                            </p>
                            <p className="text-[13px] font-medium text-blue-800">
                                Merit awards based on exam ranking
                            </p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-blue-900">
                                100%
                            </p>
                            <p className="text-[13px] font-medium text-blue-800">
                                Of entry fees go to education services
                            </p>
                        </div>
                    </div>
                    <p className="mt-5 text-[14px] leading-7 text-blue-900">
                        The Medrae Merit Cup is an academic olympiad. Like the
                        Kenya Science and Engineering Fair or the Kenya Music
                        Festival, it exists to reward study, skill, and merit.
                        Awards are{" "}
                        <strong>fixed, published merit prizes</strong> based
                        purely on final exam ranking ~ not a pool, not a
                        percentage of entry fees, and not a chance draw. Entry
                        fees cover study materials, exam marking, certificates,
                        and premium access. Cash awards are separate merit
                        prizes funded by Medrae.
                    </p>
                </section>

                {/* ============ WELLNESS & SUPPORT ============ */}
                <section className="mt-16">
                    <div className="flex items-center gap-3">
                        <HeartPulse className="h-6 w-6 text-blue-700" />
                        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            Why This Matters Beyond the Exam
                        </h2>
                    </div>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-700 sm:text-base">
                        <p>
                            Nursing school in Kenya is hard. Between
                            placements, exam pressure, and the cost of
                            training, many students quietly struggle ~ with
                            burnout, with fees, and with the loneliness of a
                            demanding course.
                        </p>
                        <p>
                            The Merit Cup exists for more than ranking. It
                            brings nursing students across the country into a
                            shared academic community ~ a place where effort
                            is seen, where daily practice becomes a habit
                            instead of a panic, and where students support each
                            other through the long haul.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Support &amp; Recognition on Medrae
                            </h3>
                            <ul className="mt-3 space-y-3 pl-5 text-slate-700">
                                <li className="list-disc">
                                    <strong>Daily wellness check-ins</strong> ~
                                    because your mental health matters as much
                                    as your marks.
                                </li>
                                <li className="list-disc">
                                    <strong>Community support</strong> ~ a
                                    space to ask questions, share struggles,
                                    and encourage other nursing students.
                                </li>
                                <li className="list-disc">
                                    <strong>
                                        Recognition for consistency
                                    </strong>{" "}
                                    ~ streaks, leaderboards, and public
                                    acknowledgement of sustained effort, not
                                    just top scores.
                                </li>
                                <li className="list-disc">
                                    <strong>
                                        Access &amp; opportunity
                                    </strong>{" "}
                                    ~ the Merit Cup opens doors for outstanding
                                    students to be noticed by tutors, mentors,
                                    and institutions.
                                </li>
                            </ul>
                        </div>

                        <p>
                            Looking ahead, Medrae is actively building ways to
                            support nursing students beyond academics ~
                            including resources for school fees, mentorship
                            pathways, and connections to opportunities that
                            keep talented students in the profession.
                        </p>
                    </div>
                </section>

                {/* ============ FAQ ============ */}
                <section className="mt-16">
                    <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                        Frequently Asked Questions
                    </h2>

                    <div className="mt-6 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Is this a betting or gambling competition?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                No. The Medrae Nursing Merit Cup is an academic
                                olympiad ~ in the same category as the Kenya
                                Science and Engineering Fair or the Kenya Music
                                Festival. There are no wagering mechanics, no
                                random draws, and no chance-based winners. Cash
                                awards are fixed, published merit prizes based
                                purely on final exam ranking.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How much does it cost to register?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Students and interns register for KSh 999.
                                Staff nurses and tutors register for KSh 1,499
                                (CPD points included).
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What does the entry fee cover?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Two months of Medrae Premium, a full study
                                pack, three mock NCK exams, exam marking, a
                                Certificate of Participation, and ~ for staff
                                nurses ~ CPD points and a CPD certificate. One
                                hundred percent of the fee goes to education
                                services. Cash merit awards are funded by
                                Medrae and are separate from entry fees.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What are the cash merit awards?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                <strong>Students &amp; Interns:</strong> 1st ~
                                KSh 12,000; 2nd ~ KSh 8,000; 3rd ~ KSh 6,000.
                                <br />
                                <strong>
                                    Staff Nurses &amp; Tutors:
                                </strong>{" "}
                                1st ~ KSh 16,000; 2nd ~ KSh 12,000; 3rd ~ KSh
                                10,000.
                                <br />
                                These are fixed merit prizes based purely on
                                final exam ranking. No pool, no percentage of
                                fees, no chance.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Can staff nurses and tutors join?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Yes. Staff nurses and tutors compete in their
                                own category. Registration is KSh 1,499 and
                                includes CPD points and a CPD certificate on
                                completion.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Will I get CPD points?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Staff Nurse / Tutor participants receive CPD
                                points and a CPD certificate upon completion.
                                The exact CPD value is confirmed at the start
                                of each Cup.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What happens if I do not rank in the top 50?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                You still receive the full two months of
                                Premium, all three mock exams, and a
                                Certificate of Participation. The Cup is
                                designed so that every participant finishes
                                stronger than they started.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How many participants can join?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Each Cup is limited to{" "}
                                <strong>600 slots</strong> to preserve quality
                                of marking, support, and recognition. Two Cups
                                run each year.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ FINAL CTA ============ */}
                <section className="mt-16 rounded-2xl bg-blue-700 p-6 text-white sm:p-10">
                    <h2 className="text-xl font-bold sm:text-3xl">
                        Register Now ~ Limited to 600 Slots Per Cup
                    </h2>
                    <p className="mt-3 text-[15px] leading-7 text-blue-100 sm:text-base">
                        Registration for the next Medrae National Nursing Merit
                        Cup opens soon. Secure your place and start preparing
                        for two months of focused, nationally-recognised
                        nursing excellence.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/60 sm:text-base"
                        >
                            Register as Student ~ KSh 999
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 px-6 py-4 text-sm font-bold text-white ring-1 ring-white/40 transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-white/60 sm:text-base"
                        >
                            Register as Staff Nurse ~ KSh 1,499
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <p className="mt-5 text-[13px] text-blue-100">
                        Payment via M-Pesa. Paybill details will be shared
                        immediately after registration. All entry fees go to
                        education services ~ study pack, exam marking,
                        certificates, and premium access.
                    </p>
                </section>
            </article>

            {/* ============ Shared SEO Footer ============ */}
            <SeoFooter />
        </main>
    );
}