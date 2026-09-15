import { Link } from "react-router-dom";
import { useEffect } from "react";
import SeoFooter from "./SeoFooter";


/**
 * Public SEO page: KRCHN Revision
 * Route: /krchn-revision
 * Static content only. No Supabase, no data fetching.
 */
export default function KRCHNRevisionPage() {
    useEffect(() => {
        const SITE_URL = "https://medrae.vercel.app";
        const PAGE_PATH = "/krchn-revision";
        const CANONICAL = `${SITE_URL}${PAGE_PATH}`;

        const prevTitle = document.title;
        document.title =
            "KRCHN Revision in Kenya | Prepare for the NCK Exam";

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
            "KRCHN revision guide for Kenyan nursing students. Preparation strategy, subjects tested, high-yield topics, and how to practise NCK exam questions on Medrae."
        );
        setMeta(
            "property",
            "og:title",
            "KRCHN Revision in Kenya | Prepare for the NCK Exam"
        );
        setMeta(
            "property",
            "og:description",
            "What to revise for the KRCHN NCK exam, which subjects carry the most marks, and how to build an effective revision routine."
        );
        setMeta("property", "og:type", "article");
        setMeta("property", "og:url", CANONICAL);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta(
            "name",
            "twitter:title",
            "KRCHN Revision in Kenya | Prepare for the NCK Exam"
        );
        setMeta(
            "name",
            "twitter:description",
            "A practical KRCHN revision guide for Kenyan nursing students preparing for the NCK licensure exam."
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
                        KRCHN Revision
                    </p>
                </div>

                {/* ============ H1 & Intro ============ */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    KRCHN Revision in Kenya
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                    How to prepare for the KRCHN NCK licensure exam — what to
                    revise, which topics carry the most marks, and how to
                    practise effectively.
                </p>

                <section className="mt-8 space-y-4 text-[15px] leading-7 sm:text-base">
                    <p>
                        If you are a KRCHN student, you are training for one of
                        the most important exams of your career. The NCK
                        licensure exam is the final step before you can legally
                        practise as a Kenya Registered Community Health Nurse.
                    </p>
                    <p>
                        This page breaks down what the KRCHN exam covers, which
                        areas consistently appear in questions, and how to build
                        a revision strategy that gets you ready. You can then
                        put it into practice directly on Medrae Nursing, where
                        Kenyan nursing students work through NCK-style
                        questions.
                    </p>
                </section>

                {/* ============ About KRCHN ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        What Is the KRCHN Programme?
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            KRCHN stands for{" "}
                            <strong>
                                Kenya Registered Community Health Nurse
                            </strong>
                            . It is a three-year diploma programme regulated by
                            the Nursing Council of Kenya (NCK) that trains
                            nurses to provide preventive, promotive, and basic
                            curative healthcare services — particularly in
                            community and primary healthcare settings.
                        </p>
                        <p>
                            The programme combines three major areas of
                            training: general nursing, community health
                            nursing, and midwifery. Graduates are qualified to
                            work as clinical nurses, community nurses, and
                            midwives in hospitals, health centres, and
                            community health programmes across Kenya.
                        </p>
                        <p>
                            Entry requires a KCSE mean grade of C (Plain) or
                            above, with minimum grades in Biology, English or
                            Kiswahili, and Mathematics or Physics or Chemistry.
                        </p>
                    </div>
                </section>

                {/* ============ The Exam ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        What the KRCHN NCK Exam Covers
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            The KRCHN licensure exam is split into{" "}
                            <strong>two papers</strong>, both sat as timed
                            computer-based tests at your designated exam
                            centre.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Paper 1 — Medical-Surgical &amp; Clinical
                                Nursing
                            </h3>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                                <li>
                                    Medical-Surgical Nursing (adult health)
                                </li>
                                <li>Pharmacology and Therapeutics</li>
                                <li>Anatomy &amp; Physiology</li>
                                <li>Microbiology &amp; Parasitology</li>
                                <li>Fundamentals of Nursing</li>
                                <li>Nutrition &amp; Dietetics</li>
                            </ul>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Paper 2 — Community Health, Midwifery &amp;
                                Professional Practice
                            </h3>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                                <li>Community Health Nursing</li>
                                <li>Midwifery &amp; Maternal Health</li>
                                <li>Paediatric Nursing</li>
                                <li>
                                    Mental Health &amp; Psychiatric Nursing
                                </li>
                                <li>Leadership &amp; Management</li>
                                <li>Nursing Research</li>
                                <li>Professional Practice &amp; Ethics</li>
                            </ul>
                        </div>

                        <p>
                            Both papers are important, but candidates tend to
                            find Paper 1 more content-heavy and Paper 2 more
                            concept-driven. Do not neglect the
                            &ldquo;easy&rdquo; subjects on Paper 2 —
                            Professional Practice, Research, and Leadership
                            carry guaranteed marks that many students leave on
                            the table.
                        </p>
                    </div>
                </section>

                {/* ============ High-Yield Topics ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        High-Yield Topics for KRCHN Revision
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <p>
                            Not all topics appear equally in the exam. These
                            are the areas where KRCHN questions cluster most
                            heavily.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Medical-Surgical Nursing
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The largest content area. Focus on
                                cardiovascular, respiratory (especially TB),
                                neurological, renal, endocrine, and
                                gastrointestinal conditions. Expect questions
                                on nursing assessment, priority interventions,
                                and patient education.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Midwifery — Prioritise Complications
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Normal labour and delivery is rarely tested in
                                depth because most students already know it.
                                What fails students is obstetric emergencies:
                                pre-eclampsia (including magnesium sulphate
                                administration and toxicity monitoring),
                                postpartum haemorrhage (the 4 Ts), and
                                antepartum haemorrhage.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Community Health — Kenya-Specific Frameworks
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Do not study community health from a generic
                                textbook. KRCHN questions test Kenya&rsquo;s
                                national frameworks: KEPI immunisation
                                schedule, IDSR disease surveillance, KEPH
                                levels of care, IMCI protocols, Kenya&rsquo;s
                                malaria treatment guidelines, and the national
                                TB programme.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Pharmacology
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Drug classifications, mechanisms of action,
                                side effects, and nursing implications.
                                High-yield drugs include anti-hypertensives,
                                anti-TB drugs (RHZE regimens), antimalarials
                                (ACT), ARVs, and insulin.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Paediatric Nursing
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Growth and development milestones, KEPI
                                immunisation schedule, IMCI
                                classify-assess-treat framework, danger signs,
                                and neonatal care.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Revision Strategy ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        How to Structure Your KRCHN Revision
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 1: Diagnose Your Gaps (First 2–3 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Do not open a textbook first. Sit a diagnostic
                                assessment across both papers. Score yourself
                                honestly and rank your subjects from weakest to
                                strongest. This ranking becomes your study
                                priority order.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 2: Content by Priority (Middle 5–6 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Attack your weakest area first, while you still
                                have time to build it up. Work through body
                                systems rather than isolated diseases. For each
                                system, review the normal anatomy briefly,
                                study the most commonly tested disorders, then
                                immediately practise questions on that system.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 3: Practice Under Exam Conditions (Final
                                3–4 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Timed mock exams are non-negotiable. The KRCHN
                                exam is computer-based, and the time pressure
                                on screen is different from paper-based
                                practice. Work through full mock papers within
                                the time limit and review every wrong answer.
                            </p>
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
                            Revise KRCHN on Medrae
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
                            Medrae Nursing is built for Kenyan nursing students
                            preparing for the NCK exam. It is not just a
                            question bank — it is a complete KRCHN revision
                            system that follows you from Year 1 of your diploma
                            all the way to your licensure exam.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Feature 1 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Complete 3-Year KRCHN Curriculum
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae covers the entire KRCHN programme —{" "}
                                <strong>80+ modules</strong> and{" "}
                                <strong>1,000+ sub-units</strong> organised by
                                year, semester, module, unit, and topic.
                                First-year KRCHN students can start practising
                                on the same platform they will use to prepare
                                for the NCK exam.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Unit-Based Questions — Jump to the Exact Weak
                                Area
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Questions are organised by{" "}
                                <strong>unit, condition, and topic</strong>,
                                not dumped into one big pool. If your
                                diagnostic shows weakness in pre-eclampsia or
                                pulmonary TB, you jump straight to that unit
                                and drill only those questions — instead of
                                scrolling through unrelated material.
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
                                . That is where clinical reasoning is built —
                                the skill the KRCHN NCK exam actually tests. No
                                more memorising bare answer keys.
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
                                throughout practice — short bursts of key
                                facts, mnemonics, and images. Especially
                                powerful for pharmacology, midwifery
                                emergencies, and Kenya&rsquo;s KEPI
                                immunisation schedule.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                DigiProctor-Style Exam Simulation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                The KRCHN NCK exam is computer-based. Medrae
                                gives you a{" "}
                                <strong>
                                    DigiProctor-style timed simulation
                                </strong>{" "}
                                with the same layout, question flagging, and
                                time pressure you will face on the real
                                platform. You practise on-screen, under
                                pressure, before exam day.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                My Mistakes — Turn Wrong Answers Into Learning
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Every question you get wrong is automatically
                                saved to your{" "}
                                <strong>My Mistakes</strong> log. To clear it,
                                you must go back, re-read the question, and
                                mark it as understood. Watching that list
                                shrink is measurable proof of your KRCHN
                                progress.
                            </p>
                        </div>

                        {/* Feature 7 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Progress Tracking &amp; Readiness Analytics
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae shows you{" "}
                                <strong>
                                    which KRCHN units are strong and which need
                                    work
                                </strong>
                                , tracks your score trends over time, and
                                recommends what to practise next. No more
                                guessing whether you are ready.
                            </p>
                        </div>

                        {/* Feature 8 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                MedTube — Curated Nursing Videos
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Some topics click better with visuals.{" "}
                                <strong>MedTube</strong> offers thousands of
                                curated nursing education videos — organised by
                                topic, no ads, no distractions. Perfect for
                                midwifery, anatomy, and clinical skills.
                            </p>
                        </div>

                        {/* Feature 9 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Leaderboard, Streaks &amp; Community Motivation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Three years of study is a long road. Medrae
                                adds a{" "}
                                <strong>
                                    leaderboard, streak tracking, and community
                                    support
                                </strong>{" "}
                                so you stay consistent from Year 1 through to
                                the NCK exam. Gentle competition with peers
                                turns revision into a habit.
                            </p>
                        </div>

                        {/* Feature 10 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Survival Hub, Wellness &amp; NursMartt
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae supports the whole KRCHN student. The{" "}
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
                            Start KRCHN revision on Medrae
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
                        Common KRCHN Revision Mistakes
                    </h2>
                    <ul className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Ignoring &ldquo;easy&rdquo; subjects.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Many students spend all their time on
                                Medical-Surgical Nursing and neglect
                                Professional Practice, Research, or Leadership.
                                These subjects carry guaranteed marks on Paper
                                2.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Memorising answers instead of reasoning.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The NCK exam tests clinical reasoning. If you
                                only memorise, you will struggle when a
                                question is phrased differently.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Using BScN materials for KRCHN revision.
                            </strong>{" "}
                            <span className="text-slate-700">
                                KRCHN and BScN candidates sit separate papers.
                                KRCHN questions are tailored to the diploma
                                curriculum — do not revise using degree-level
                                materials.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Studying community health from a generic
                                textbook.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Kenya-specific frameworks (KEPI, IDSR, IMCI,
                                KEPH) are what appear in exam questions.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Practising without time pressure.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The exam is timed. Untimed practice builds
                                knowledge but not exam speed.
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
                                How many papers does the KRCHN NCK exam have?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Two papers: Paper 1 (Medical-Surgical &amp;
                                Clinical Nursing) and Paper 2 (Community
                                Health, Midwifery &amp; Professional Practice).
                                Both are sat as timed computer-based tests.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What is the difference between KRCHN and KRN?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                KRCHN (Kenya Registered Community Health Nurse)
                                is a diploma that combines general nursing,
                                community health, and midwifery. KRN (Kenya
                                Registered Nurse) is a separate diploma
                                programme. Both are regulated by the NCK, but
                                they have different curricula and sit separate
                                licensure exams.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How long is the KRCHN programme?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The KRCHN diploma is a three-year programme
                                offered at KMTC and private medical training
                                colleges accredited by the NCK.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What entry grade do I need for KRCHN?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                KCSE mean grade C (Plain) or above, with
                                minimum C in Biology, C in English or
                                Kiswahili, and C- in Mathematics or Physics or
                                Chemistry.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Where can I practise KRCHN NCK questions?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Medrae Nursing offers KRCHN-style practice
                                questions with rationales, covering both
                                papers. Start practising at{" "}
                                <Link
                                    to="/nursing"
                                    className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                                >
                                    Medrae Nursing
                                </Link>
                                .
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Final CTA ============ */}
                <section className="mt-12 rounded-2xl bg-blue-50 p-6 sm:p-8">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Ready to Revise for KRCHN?
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            The KRCHN NCK exam tests clinical reasoning across
                            the full diploma syllabus. Reading alone will not
                            get you there — you need to practise questions,
                            learn from rationales, and track your weak areas.
                        </p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Medrae Nursing helps Kenyan KRCHN students do
                            exactly that, with NCK-style questions, rationales,
                            unit-based practice, and progress tracking built
                            for the diploma curriculum — from Year 1 through to
                            your licensure exam.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base"
                        >
                            Continue your KRCHN revision
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