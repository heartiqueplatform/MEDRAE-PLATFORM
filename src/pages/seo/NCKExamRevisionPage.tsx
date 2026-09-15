import { Link } from "react-router-dom";
import { useEffect } from "react";
import SeoFooter from "./SeoFooter";


/**
 * Public SEO page: NCK Exam Revision
 * Route: /nck-exam-revision
 * Static content only. No Supabase, no data fetching.
 */
export default function NCKExamRevisionPage() {
    useEffect(() => {
        const SITE_URL = "https://medrae.vercel.app";
        const PAGE_PATH = "/nck-exam-revision";
        const CANONICAL = `${SITE_URL}${PAGE_PATH}`;

        const prevTitle = document.title;
        document.title =
            "NCK Exam Revision in Kenya | How to Prepare & Practise";

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
            "A practical guide to NCK exam revision in Kenya. Learn what the NCK licensure exam tests, what to revise first, common mistakes, and how to practise effectively on Medrae."
        );
        setMeta(
            "property",
            "og:title",
            "NCK Exam Revision in Kenya | How to Prepare & Practise"
        );
        setMeta(
            "property",
            "og:description",
            "What the NCK exam actually tests, how to structure revision, key exam rules, and how to practise for the online NCK format."
        );
        setMeta("property", "og:type", "article");
        setMeta("property", "og:url", CANONICAL);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta(
            "name",
            "twitter:title",
            "NCK Exam Revision in Kenya | How to Prepare & Practise"
        );
        setMeta(
            "name",
            "twitter:description",
            "A practical NCK revision guide for Kenyan nursing students — what to revise, how to practise, and the rules you must know."
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
                        NCK Exam Revision
                    </p>
                </div>

                {/* ============ H1 & Intro ============ */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    NCK Exam Revision in Kenya
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                    How to prepare, what to revise, and how to practise for the
                    Nursing Council of Kenya licensure exam.
                </p>

                <section className="mt-8 space-y-4 text-[15px] leading-7 sm:text-base">
                    <p>
                        The Nursing Council of Kenya (NCK) licensure exam is the
                        final gateway between you and your nursing licence.
                        Whether you are sitting for the KRCHN diploma or the
                        BScN degree, the exam tests whether you can think like a
                        safe, competent practitioner — not just recall facts.
                    </p>
                    <p>
                        This page breaks down what the NCK exam actually looks
                        like, what you should revise, and how to build a
                        revision routine that works. You can then put it into
                        practice directly on Medrae Nursing, where Kenyan
                        nursing students revise, practise, and track their
                        progress.
                    </p>
                </section>

                {/* ============ What the NCK Exam Tests ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        What the NCK Exam Actually Tests
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            The NCK exam has moved away from the old paper-based
                            format. It is now delivered online through a
                            proctoring system, with candidates answering
                            multiple-choice questions, short-answer questions,
                            and scenario-based long-answer questions.
                        </p>
                        <p>
                            Each paper lasts <strong>two hours</strong>, with
                            morning sessions starting at 9:00 a.m. and afternoon
                            sessions at 2:00 p.m.
                        </p>
                        <p>
                            For basic cadres like KRCHN, the exam is split into{" "}
                            <strong>two papers</strong>:
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Paper 1 — Clinical Nursing
                            </h3>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                                <li>Adult nursing (Medical-Surgical)</li>
                                <li>Paediatric nursing</li>
                                <li>Critical care and theatre nursing</li>
                                <li>Professionalism and trends in nursing</li>
                                <li>Communication and counselling</li>
                                <li>
                                    Reproductive health (pregnancy, labour,
                                    puerperium, contraception, gynaecology,
                                    STIs/HIV)
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Paper 2 — Community &amp; Psychosocial Nursing
                            </h3>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                                <li>
                                    Community health nursing and primary health
                                    care
                                </li>
                                <li>Environmental health</li>
                                <li>Communicable diseases</li>
                                <li>Community diagnosis</li>
                                <li>
                                    Mental health and psychiatric nursing
                                </li>
                                <li>Sociology and anthropology</li>
                                <li>Research in nursing</li>
                                <li>Leadership and management</li>
                                <li>Teaching and learning methodology</li>
                            </ul>
                        </div>

                        <p>
                            BScN candidates face the same core areas but with
                            greater depth in evidence-based practice, research,
                            leadership, and critical care.
                        </p>
                    </div>
                </section>

                {/* ============ What Matters Most ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        What Actually Matters Most During Revision
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <p>
                            Not all topics carry equal weight in the exam — and
                            not all topics are equally difficult. Knowing where
                            to focus your energy is the difference between
                            scattered revision and targeted preparation.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Medical-Surgical Nursing and Midwifery
                            </h3>
                            <p className="mt-2 text-slate-700">
                                These two areas are consistently the most
                                challenging for candidates. They are
                                content-heavy, and they appear across both
                                papers. If you are weak in either, they should
                                get the largest share of your study time.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Kenya-Specific Clinical Guidelines
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The NCK exam does not test generic textbook
                                protocols. It tests{" "}
                                <strong>
                                    Kenya&rsquo;s national guidelines
                                </strong>
                                .
                            </p>
                            <p className="mt-3 text-slate-700">
                                For example:
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                                <li>
                                    TB questions follow Kenya&rsquo;s national
                                    TB programme (DOTS, contact tracing,
                                    drug-resistant TB protocols)
                                </li>
                                <li>
                                    Malaria questions follow Kenya&rsquo;s
                                    malaria treatment guidelines
                                </li>
                                <li>
                                    Immunisation questions follow KEPI (Kenya
                                    Expanded Programme on Immunisation), not a
                                    generic WHO schedule
                                </li>
                            </ul>
                            <p className="mt-3 text-slate-700">
                                If you are only using imported textbooks, you
                                will miss marks on questions that assume
                                familiarity with Kenya&rsquo;s health system.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Scenario and Short-Answer Questions
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Multiple-choice questions test recall. Scenario
                                and short-answer questions test{" "}
                                <strong>clinical reasoning</strong> — your
                                ability to assess a situation, prioritise
                                actions, and justify decisions. Many candidates
                                who practise only MCQs struggle with these.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ How to Structure Revision ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        How to Structure Your Revision
                    </h2>

                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 1: Diagnose Your Gaps (First 2–3 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Do not open a textbook first. Sit a diagnostic
                                assessment.
                            </p>
                            <p className="mt-2 text-slate-700">
                                Attempt questions across all papers, score
                                yourself honestly, and rank your papers from
                                weakest to strongest. This ranking becomes your
                                study priority order.
                            </p>
                            <p className="mt-2 text-slate-700">
                                Also confirm your examination centre and
                                registration status early.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 2: Content by Priority (Middle 5–6 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Attack your weakest area first, while you still
                                have time to build it up.
                            </p>
                            <p className="mt-2 text-slate-700">
                                Work through body systems rather than isolated
                                diseases. For each system:
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                                <li>
                                    Review the normal anatomy and physiology
                                    briefly
                                </li>
                                <li>
                                    Study the most commonly tested disorders —
                                    presentation, nursing assessment, priority
                                    interventions
                                </li>
                                <li>
                                    Immediately practise questions on that
                                    system before moving on
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 3: Practice Under Exam Conditions (Final
                                3–4 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Timed mock exams are non-negotiable. The NCK
                                exam is now digital, and the time pressure on
                                screen is different from paper-based practice.
                            </p>
                            <p className="mt-2 text-slate-700">
                                You need to practise:
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                                <li>
                                    Answering MCQs within the time limit
                                </li>
                                <li>
                                    Structuring concise written responses to
                                    scenario questions
                                </li>
                                <li>
                                    Navigating the online exam interface
                                </li>
                            </ul>
                        </div>
                    </div>
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
                            Why Kenyan Nursing Students Revise on Medrae
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
                            Medrae Nursing is built specifically for the Kenyan
                            nursing curriculum and the NCK exam. It is not just
                            a question bank — it is a complete revision system
                            that follows you from Year 1 of your training all
                            the way to your licensure exam.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Feature 1 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Complete 3-Year Curriculum — Use It From Day One
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae covers the entire KRCHN programme —{" "}
                                <strong>80+ modules</strong> and{" "}
                                <strong>1,000+ sub-units</strong> organised by
                                year, semester, and topic. First-year students
                                can start practising on the same platform they
                                will use to prepare for the NCK exam. No more
                                waiting until final year to begin revision.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Unit-Based Question Bank — Jump to the Exact
                                Weak Area
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Unlike apps that dump questions into one big
                                pool, Medrae organises every question by{" "}
                                <strong>unit, condition, and topic</strong>. If
                                your diagnostic shows you are weak in, say,
                                pre-eclampsia or pulmonary TB, you jump straight
                                to that unit and drill only those questions —
                                instead of scrolling through unrelated material.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Flashcards &amp; Micro-Cards Between Questions
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae interleaves{" "}
                                <strong>
                                    flashcards, micro-cards, and memory aids
                                </strong>{" "}
                                throughout practice — short bursts of key
                                facts, mnemonics, and images that help clinical
                                information stick. This is especially powerful
                                for pharmacology, anatomy, and diagnostic
                                criteria that are easy to forget under exam
                                pressure.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                DigiProctor-Style Exam Simulation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                The NCK exam is computer-based. Medrae gives you
                                a{" "}
                                <strong>
                                    DigiProctor-style timed simulation
                                </strong>{" "}
                                with the same layout, question flagging, and
                                time pressure you will face on the real
                                platform. You practise on-screen, under
                                pressure, before exam day — so the real thing
                                feels familiar, not frightening.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Study Notes &amp; Exam-Pattern-Derived Content
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Every unit comes with{" "}
                                <strong>concise study notes</strong> you can
                                read before practising. Questions are developed
                                from{" "}
                                <strong>
                                    past-paper patterns and analysis of the
                                    most frequently tested topics
                                </strong>{" "}
                                — so you are studying what is most likely to
                                appear on the exam, not what is unlikely.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                My Mistakes — Turn Every Wrong Answer Into
                                Learning
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Every question you get wrong is automatically
                                saved to your{" "}
                                <strong>My Mistakes</strong> log. To clear it,
                                you must go back, re-read the question, and
                                mark it as understood. Watching your mistakes
                                list shrink becomes a measurable sign of
                                progress — and a strong source of motivation.
                            </p>
                        </div>

                        {/* Feature 7 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Progress Tracking &amp; Performance Analytics
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae shows you{" "}
                                <strong>
                                    exactly which units are strong and which
                                    need work
                                </strong>
                                , tracks your score trends over time, and
                                recommends what to study next. No more guessing
                                whether you are ready — you can see your
                                readiness improving week by week.
                            </p>
                        </div>

                        {/* Feature 8 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Leaderboard, Streaks &amp; Community Motivation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Studying alone is hard. Medrae adds a{" "}
                                <strong>
                                    leaderboard, streak tracking, and community
                                    support
                                </strong>{" "}
                                so you stay consistent. Gentle competition with
                                peers and visible daily progress are what turn
                                revision into a habit instead of a last-minute
                                scramble.
                            </p>
                        </div>

                        {/* Feature 9 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                MedTube — Curated Nursing Videos
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Some topics click better with visuals.{" "}
                                <strong>MedTube</strong> offers thousands of
                                curated nursing education videos — organised by
                                topic, no ads, no distractions. It sits
                                alongside your question bank so you can switch
                                between reading, watching, and practising
                                without leaving Medrae.
                            </p>
                        </div>

                        {/* Feature 10 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Survival Hub, Wellness &amp; NursMartt
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae supports the whole student, not just the
                                exam. The <strong>Survival Hub</strong> helps
                                with housing, hospital placements, exam
                                centres, and exam buddies.{" "}
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
                            Start NCK revision on Medrae
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50 hover:ring-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-base"
                        >
                            Create a free account
                        </Link>
                    </div>
                </section>

                {/* ============ Common Mistakes ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Common Mistakes That Cost Candidates Marks
                    </h2>
                    <ul className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Spreading revision equally across all papers.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Medical-Surgical and Midwifery are heavier and
                                more commonly failed. They need more time.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Preparing for the old paper-based format.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The exam is now computer-based. Practising
                                handwritten essays will not prepare you for the
                                online scenario questions.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Ignoring Kenya-specific protocols.
                            </strong>{" "}
                            <span className="text-slate-700">
                                If you answer TB questions using generic
                                textbook protocols instead of Kenya&rsquo;s
                                national guidelines, you will lose marks.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Skipping the rehearsal.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The NCK requires candidates to attend a
                                rehearsal and complete mock exams before
                                sitting the main exam. Missing rehearsal can
                                result in disqualification. It is also your
                                only chance to test the exam system before the
                                real thing.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Arriving late.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Candidates must arrive{" "}
                                <strong>one hour before</strong> each paper.
                                Anyone arriving more than{" "}
                                <strong>30 minutes late</strong> will not be
                                admitted.
                            </span>
                        </li>
                    </ul>
                </section>

                {/* ============ Key Rules ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Key Rules You Must Know Before Exam Day
                    </h2>
                    <p className="mt-5 text-[15px] leading-7 sm:text-base">
                        The NCK enforces strict examination rules. These are not
                        suggestions:
                    </p>
                    <ul className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Rehearsal is mandatory.
                            </strong>{" "}
                            <span className="text-slate-700">
                                You must attend in person, complete mock exams,
                                receive your exam card, and sign the attendance
                                record. Failure to attend may result in
                                disqualification.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Bring your National ID and NCK Exam Card.
                            </strong>{" "}
                            <span className="text-slate-700">
                                No admission without both.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Dress code is enforced.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Candidates trained in Kenya must wear either
                                their school uniform or the official
                                nurses/midwives&rsquo; uniform. Revealing or
                                casual attire can get you removed from the exam
                                centre.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                No electronic devices.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Phones, smartwatches, earbuds, and Bluetooth
                                devices are strictly prohibited. Violation
                                means immediate disqualification.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                No other applications open.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Only the designated exam application may be
                                running. Background apps are treated as an exam
                                irregularity.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Exam malpractice = 1-year ban.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Results are cancelled, and you are prohibited
                                from sitting any NCK exams for one year.
                            </span>
                        </li>
                    </ul>
                </section>

                {/* ============ FAQ ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Frequently Asked Questions
                    </h2>

                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How many papers does the NCK exam have?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                For basic cadres like KRCHN, it is two papers.
                                The Council states that basic cadres sit four
                                individual papers, but the current online
                                format consolidates content into two papers.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How long is each paper?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Two hours per paper.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What happens if I fail a paper?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Candidates are allowed a maximum of{" "}
                                <strong>four resits</strong>. You must satisfy
                                the Board of Examiners for each paper before you
                                can apply for registration and licensing.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Can I take the exam remotely?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Requests for remote examination must be
                                submitted in writing at least{" "}
                                <strong>
                                    two weeks before the rehearsal date
                                </strong>
                                , with supporting documentation. The Council
                                reviews each request and reserves the right to
                                grant or deny it.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Is the NCK exam multiple-choice only?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                No. It includes multiple-choice questions,
                                short-answer questions, and long-answer
                                scenario questions where you respond to brief
                                healthcare scenarios.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Final CTA ============ */}
                <section className="mt-12 rounded-2xl bg-blue-50 p-6 sm:p-8">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Ready to Practise on Medrae?
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Revision is not just reading. It is testing
                            yourself, finding your gaps, and closing them one
                            question at a time.
                        </p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Medrae Nursing helps Kenyan nursing students
                            practise the exact topics the NCK exam tests — with
                            explanations, progress tracking, and a mobile-first
                            experience built for how students actually study.
                            Use it from Year 1 all the way to your licensure
                            exam.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base"
                        >
                            Continue your NCK revision
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