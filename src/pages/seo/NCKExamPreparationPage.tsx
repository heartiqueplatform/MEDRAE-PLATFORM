import { Link } from "react-router-dom";
import { useEffect } from "react";
import SeoFooter from "./SeoFooter";


/**
 * Public SEO page: NCK Exam Preparation
 * Route: /nck-exam-preparation
 * Static content only. No Supabase, no data fetching.
 */
export default function NCKExamPreparationPage() {
    useEffect(() => {
        const SITE_URL = "https://medrae.vercel.app";
        const PAGE_PATH = "/nck-exam-preparation";
        const CANONICAL = `${SITE_URL}${PAGE_PATH}`;

        const prevTitle = document.title;
        document.title =
            "NCK Exam Preparation in Kenya | From Revision to Exam Day";

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
            "A practical NCK exam preparation guide for Kenyan nursing students ~ DCHN (formerly KRCHN), BSN, KRN and all cadres. Step-by-step from registration and rehearsal to final exam day preparation."
        );
        setMeta(
            "property",
            "og:title",
            "NCK Exam Preparation in Kenya | From Revision to Exam Day"
        );
        setMeta(
            "property",
            "og:description",
            "How to prepare for the NCK licensure exam from the first day of revision to final exam preparation ~ rehearsal, equipment, and exam-day rules ~ across all nursing cadres."
        );
        setMeta("property", "og:type", "article");
        setMeta("property", "og:url", CANONICAL);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta(
            "name",
            "twitter:title",
            "NCK Exam Preparation in Kenya | From Revision to Exam Day"
        );
        setMeta(
            "name",
            "twitter:description",
            "A step-by-step NCK preparation guide for Kenyan nursing students ~ registration, rehearsal, revision strategy, and exam day."
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
            <article className="w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
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
                        NCK Exam Preparation
                    </p>
                </div>

                {/* ============ H1 & Intro ============ */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    NCK Exam Preparation in Kenya
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                    A step-by-step preparation guide from the first day of
                    revision to the final moments before you sit your NCK
                    licensure exam ~ across all nursing cadres.
                </p>

                <section className="mt-8 space-y-4 text-[15px] leading-7 sm:text-base">
                    <p>
                        Preparing for the NCK exam is not just about studying.
                        It is a sequence of steps ~ register, rehearse, revise,
                        and show up ready. Miss one step and you can lose your
                        sitting before you answer a single question.
                    </p>
                    <p>
                        This guide walks you through the full preparation
                        process. If you want the topic-by-topic revision plan
                        instead, see our{" "}
                        <Link
                            to="/nck-exam-revision"
                            className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                        >
                            NCK exam revision guide
                        </Link>
                        . This page focuses on the practical preparation steps
                        around the exam itself.
                    </p>
                </section>

                {/* ============ Step 1: Registration ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Step 1: Register Early and Correctly
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            Registration for the NCK licensure exam goes
                            through your training institution. You will receive
                            an email link to complete your application on the
                            NCK portal.
                        </p>
                        <p>
                            The exam is typically offered three times a year ~
                            May, August, and November. Application deadlines
                            are usually set several weeks before the exam, and
                            missing them means waiting for the next sitting.
                        </p>
                        <p>
                            The current examination fee is{" "}
                            <strong>KSh 8,000 per programme</strong>.
                        </p>
                        <div className="rounded-xl bg-slate-50 p-5">
                            <p className="text-slate-700">
                                <strong className="text-slate-900">
                                    What to do:
                                </strong>{" "}
                                Confirm your registration status early. Do not
                                assume your institution has submitted your
                                name. Verify it on the NCK portal and keep your
                                receipt.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Step 2: Rehearsal ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Step 2: Attend the Rehearsal (This Is Mandatory)
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            This is the step candidates most often
                            underestimate. The NCK requires all candidates to
                            attend an <strong>in-person rehearsal</strong> at
                            their designated exam centre before the main exam.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                The rehearsal involves:
                            </h3>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                                <li>
                                    Being physically present at the centre
                                </li>
                                <li>
                                    Completing mock exams on the actual exam
                                    system
                                </li>
                                <li>
                                    Receiving your NCK examination card
                                </li>
                                <li>Signing the attendance record</li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <p className="text-slate-700">
                                <strong className="text-slate-900">
                                    Failure to attend rehearsal may result in
                                    disqualification
                                </strong>{" "}
                                from sitting the main exam.
                            </p>
                        </div>

                        <p>
                            The rehearsal is also your only chance to test the
                            exam interface before the real thing. If there is a
                            technical issue with your device or the system, you
                            want to discover it during rehearsal, not on exam
                            day.
                        </p>
                        <div className="rounded-xl bg-slate-50 p-5">
                            <p className="text-slate-700">
                                <strong className="text-slate-900">
                                    Deadline to note:
                                </strong>{" "}
                                Any request to change your examination centre
                                must be submitted at least{" "}
                                <strong>
                                    three weeks before the rehearsal date
                                </strong>
                                .
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Step 3: Equipment ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Step 3: Prepare Your Equipment
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            The NCK exam is computer-based, and candidates are
                            expected to have a suitable laptop for the mock
                            exams. Check your device against these
                            requirements:
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <ul className="space-y-2 pl-5 text-slate-700">
                                <li className="list-disc">
                                    <strong>Processor:</strong> Intel Core i5
                                    or higher
                                </li>
                                <li className="list-disc">
                                    <strong>Operating System:</strong> Windows
                                    10 or above (or Mac OS)
                                </li>
                                <li className="list-disc">
                                    <strong>RAM:</strong> 8GB or higher
                                </li>
                                <li className="list-disc">
                                    <strong>Storage:</strong> At least 20GB
                                    free space
                                </li>
                                <li className="list-disc">
                                    <strong>Browser:</strong> Latest version
                                    of Google Chrome installed
                                </li>
                                <li className="list-disc">
                                    <strong>Webcam and microphone:</strong>{" "}
                                    Must be functional
                                </li>
                                <li className="list-disc">
                                    <strong>Battery:</strong> Reliable battery
                                    life plus your power cable
                                </li>
                                <li className="list-disc">
                                    <strong>Connectivity:</strong> Reliable
                                    Wi-Fi access; a portable Wi-Fi device with
                                    bundles is optional but recommended
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <p className="text-slate-700">
                                <strong className="text-slate-900">
                                    Do not leave this to the last minute.
                                </strong>{" "}
                                Test your laptop before the rehearsal. If it
                                does not meet the requirements, arrange an
                                alternative early.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Step 4: Revision ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Step 4: Revise Strategically
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            With registration and rehearsal sorted, your
                            attention turns to the content itself. For the full
                            revision strategy, see our dedicated{" "}
                            <Link
                                to="/nck-exam-revision"
                                className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                            >
                                NCK exam revision guide
                            </Link>
                            .
                        </p>
                        <p>
                            The short version: diagnose your gaps first, attack
                            your weakest areas while you still have time, then
                            move to timed practice under exam conditions in the
                            final weeks.
                        </p>
                        <div className="rounded-xl bg-slate-50 p-5">
                            <p className="text-slate-700">
                                <strong className="text-slate-900">
                                    One preparation-specific point:
                                </strong>{" "}
                                Practise on a computer, not just on paper. The
                                NCK exam is digital. If you have only ever
                                practised with pen and paper, the on-screen
                                format, time pressure, and navigation will feel
                                unfamiliar. Use a digital practice platform
                                that mirrors the exam experience.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Step 5: Exam Day ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Step 5: Exam Day Preparation
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <p>
                            The rules on exam day are strict. Here is what you
                            need to know:
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What to bring
                            </h3>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                                <li>
                                    <strong>National ID or Passport</strong> ~
                                    you will not be admitted without it
                                </li>
                                <li>
                                    <strong>NCK Exam Card</strong> ~ issued at
                                    the centre during rehearsal
                                </li>
                                <li>
                                    <strong>
                                        Your laptop and power cable
                                    </strong>{" "}
                                    ~ ensure it meets the requirements listed
                                    above
                                </li>
                                <li>
                                    <strong>Stationery</strong> ~ for any
                                    written components
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What to wear
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Candidates trained in Kenya must be in{" "}
                                <strong>uniform</strong> at the exam centre.
                                This is not optional. Casual or revealing
                                attire can result in removal from the centre.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                When to arrive
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Candidates must arrive at least{" "}
                                <strong>one hour before</strong> the exam start
                                time. Anyone arriving more than{" "}
                                <strong>30 minutes late</strong> will not be
                                admitted.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What is prohibited
                            </h3>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                                <li>
                                    Phones, smartwatches, earbuds, and Bluetooth
                                    devices
                                </li>
                                <li>
                                    Any applications other than the designated
                                    exam application running on your laptop
                                </li>
                            </ul>
                            <p className="mt-3 text-slate-700">
                                Violation of these rules is treated as exam
                                malpractice and can result in immediate
                                disqualification and a one-year ban.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Common Preparation Mistakes ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Common Preparation Mistakes
                    </h2>
                    <ul className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Registering late.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Missing the application deadline means waiting
                                months for the next sitting.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Skipping rehearsal.
                            </strong>{" "}
                            <span className="text-slate-700">
                                This is the fastest way to be disqualified. It
                                is mandatory.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Using an unsuitable laptop.
                            </strong>{" "}
                            <span className="text-slate-700">
                                If your device does not meet the technical
                                requirements, you may not be able to sit the
                                mock exams.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Practising only on paper.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The exam is digital. Paper-based practice does
                                not prepare you for the on-screen format.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Ignoring Kenya-specific guidelines.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The exam tests Kenya&rsquo;s national protocols
                                for TB, malaria, HIV, and immunisation ~ not
                                generic textbook approaches.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Not checking your exam centre.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The NCK sometimes shifts exam centres. Confirm
                                your designated centre before the rehearsal
                                date.
                            </span>
                        </li>
                    </ul>
                </section>

                {/* ============ Why Medrae (WHITE THEME) ============ */}
                <section className="mt-12">
                    <div className="text-center">
                        <img
                            src="/pwa-512x512.png"
                            alt="Medrae Nursing"
                            className="mx-auto h-12 w-12 rounded-xl object-contain"
                        />
                        <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
                            Prepare with Medrae
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
                            Medrae Nursing covers the revision side of NCK
                            preparation with a system that mirrors the digital
                            exam format ~ for DCHN, BSN, KRN and all nursing
                            cadres ~ so you walk into the exam centre
                            already familiar with the tools you will use.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Feature 1 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                DigiProctor-Style Exam Simulation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Because the NCK exam is now computer-based,
                                Medrae gives you a{" "}
                                <strong>
                                    DigiProctor-style timed simulation
                                </strong>{" "}
                                with the same layout, question flagging, and
                                time pressure you will face on the real
                                platform. Train on-screen, under pressure,
                                before the rehearsal ~ so the actual exam
                                system feels familiar.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Unit-Based Question Bank
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae organises questions by{" "}
                                <strong>unit, condition, and topic</strong>. If
                                your diagnostic reveals weakness in
                                pre-eclampsia or pulmonary TB, you jump
                                straight to that unit ~ no scrolling through
                                one giant pool of random questions.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Detailed Rationales for Every Question
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Every question comes with{" "}
                                <strong>
                                    explanations for why the correct answer is
                                    correct and why the others are wrong
                                </strong>
                                . That is where clinical reasoning is built ~
                                the skill the NCK exam actually tests.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Flashcards &amp; Micro-Cards Between Questions
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae interleaves{" "}
                                <strong>
                                    flashcards, micro-cards, and memory aids
                                </strong>{" "}
                                throughout practice ~ short bursts of key
                                facts, mnemonics, and images that help clinical
                                information stick. Especially useful for
                                pharmacology and diagnostic criteria.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Full 3-Year Curriculum Coverage
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                With{" "}
                                <strong>
                                    80+ modules and 1,000+ sub-units
                                </strong>
                                , Medrae covers the entire DCHN (formerly
                                KRCHN) programme ~ plus content mapped for
                                BSN, KRN and other cadres. You can start
                                revising from Year 1 ~ building knowledge
                                continuously instead of cramming in the final
                                weeks before the NCK exam.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                My Mistakes ~ Turn Wrong Answers Into Learning
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Every question you get wrong is automatically
                                saved to your{" "}
                                <strong>My Mistakes</strong> log. To clear it,
                                you must go back, re-read the question, and
                                mark it as understood. Watching that list
                                shrink is measurable proof of preparation.
                            </p>
                        </div>

                        {/* Feature 7 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Progress Tracking &amp; Readiness Score
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae shows you{" "}
                                <strong>
                                    which units are strong, which need work,
                                    and how your overall readiness is trending
                                </strong>
                                . You walk into the rehearsal knowing exactly
                                where you stand ~ not guessing.
                            </p>
                        </div>

                        {/* Feature 8 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                MedTube ~ Curated Nursing Videos
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                If a topic only clicks when you see it
                                explained, <strong>MedTube</strong> offers
                                thousands of curated nursing videos ~
                                organised by topic, ad-free, and sitting
                                alongside your question bank.
                            </p>
                        </div>

                        {/* Feature 9 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Leaderboard, Streaks &amp; Community Motivation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Long preparation is hard alone. Medrae adds a{" "}
                                <strong>
                                    leaderboard, streak tracking, and community
                                    support
                                </strong>{" "}
                                so you stay consistent from your first practice
                                session all the way to exam day.
                            </p>
                        </div>

                        {/* Feature 10 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Survival Hub, Wellness &amp; NursMartt
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Preparation is not only about content. The{" "}
                                <strong>Survival Hub</strong> helps with
                                housing, hospital placements, exam centres, and
                                exam buddies.{" "}
                                <strong>Daily wellness check-ins</strong> and
                                community support reduce the stress of nursing
                                school. And <strong>NursMartt</strong> is a
                                marketplace for affordable second-hand nursing
                                essentials.
                            </p>
                        </div>
                    </div>

                    {/* CTA buttons */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base"
                        >
                            Start NCK preparation on Medrae
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50 hover:ring-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-base"
                        >
                            Create a free account
                        </Link>
                    </div>
                </section>

                {/* ============ FAQ ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Frequently Asked Questions
                    </h2>

                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Is the NCK rehearsal really mandatory?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Yes. The NCK states that attendance at the
                                rehearsal is mandatory and failure to attend
                                may result in disqualification from sitting the
                                main examination.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How much is the NCK exam fee?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The current fee is KSh 8,000 per programme,
                                according to the NCK Service Charter.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What identification do I need on exam day?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                You must present your National ID or Passport
                                and your NCK Exam Card. No admission without
                                both.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Can I take the NCK exam remotely?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Requests for remote examination must be
                                submitted in writing to the Council at least
                                two weeks before the rehearsal date, with
                                supporting documentation. The Council reviews
                                each request and reserves the right to grant or
                                deny it.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How many times can I resit the NCK exam?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Candidates are allowed a maximum of{" "}
                                <strong>four resits</strong>. You must satisfy
                                the Board of Examiners for each paper before
                                you can apply for registration and licensing.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Final CTA ============ */}
                <section className="mt-12 rounded-2xl bg-blue-50 p-6 sm:p-8">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Ready to Prepare?
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            NCK preparation is not just about studying. It is
                            about registering on time, attending rehearsal,
                            having the right equipment, and practising under
                            real exam conditions.
                        </p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Medrae Nursing covers the practice side ~ with
                            NCK-style questions, rationales, unit-level
                            analytics, and a digital format that mirrors the
                            actual exam ~ for DCHN, BSN, KRN and all nursing
                            cadres. Use it from Year 1 through to your
                            licensure exam.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base"
                        >
                            Continue your NCK preparation
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50 hover:ring-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-base"
                        >
                            Create a free account
                        </Link>
                    </div>
                </section>
            </article>

            {/* ============ Shared SEO Footer ============ */}
            <SeoFooter />
        </main>
    );
}