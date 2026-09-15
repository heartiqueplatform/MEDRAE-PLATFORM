import { Link } from "react-router-dom";
import { useEffect } from "react";
import SeoFooter from "./SeoFooter";

/**
 * Public SEO page: NCK Exam Questions
 * Route: /nck-exam-questions
 * Static content only. No Supabase, no data fetching.
 */
export default function NCKExamQuestionsPage() {
    useEffect(() => {
        const SITE_URL = "https://medrae.vercel.app";
        const PAGE_PATH = "/nck-exam-questions";
        const CANONICAL = `${SITE_URL}${PAGE_PATH}`;

        const prevTitle = document.title;
        document.title =
            "NCK Exam Questions & Practice Questions | Kenyan Nursing";

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
            "Practice NCK exam questions for Kenyan nursing students. What the NCK exam tests, question formats, high-yield topics, and how to practise effectively on Medrae."
        );
        setMeta(
            "property",
            "og:title",
            "NCK Exam Questions & Practice Questions | Kenyan Nursing"
        );
        setMeta(
            "property",
            "og:description",
            "NCK question formats, high-yield revision topics, and how to practise for the Nursing Council of Kenya licensure exam."
        );
        setMeta("property", "og:type", "article");
        setMeta("property", "og:url", CANONICAL);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta(
            "name",
            "twitter:title",
            "NCK Exam Questions & Practice Questions | Kenyan Nursing"
        );
        setMeta(
            "name",
            "twitter:description",
            "What NCK questions actually look like, which topics carry the most marks, and how to practise for the Kenyan nursing licensure exam."
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
                        NCK Exam Questions
                    </p>
                </div>

                {/* ============ H1 & Intro ============ */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    NCK Exam Questions
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                    What the Nursing Council of Kenya exam actually asks, and
                    how to practise effectively.
                </p>

                <section className="mt-8 space-y-4 text-[15px] leading-7 sm:text-base">
                    <p>
                        If you are preparing for the NCK licensure exam, you
                        need more than textbooks. You need to practise the kind
                        of questions the exam actually asks — questions that
                        test clinical reasoning, not just recall.
                    </p>
                    <p>
                        This page breaks down the NCK question formats, the
                        high-yield topics that appear most often, and how to
                        practise effectively. You can then put it into practice
                        directly on Medrae Nursing, where Kenyan nursing
                        students work through NCK-style questions.
                    </p>
                </section>

                {/* ============ Question Formats ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        What NCK Exam Questions Actually Look Like
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            The NCK exam has moved online and now uses{" "}
                            <strong>two papers</strong> for basic cadres like
                            KRCHN. Each paper contains{" "}
                            <strong>100 questions</strong> delivered through an
                            online proctoring platform.
                        </p>
                        <p>The NCK exam includes three question formats:</p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Multiple-Choice Questions (MCQs)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The majority of the exam. These test recall and
                                application of clinical knowledge.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Short-Answer Questions
                            </h3>
                            <p className="mt-2 text-slate-700">
                                You write a brief, focused response based on a
                                clinical prompt.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Long-Answer Scenario Questions
                            </h3>
                            <p className="mt-2 text-slate-700">
                                You are given a healthcare scenario and must
                                respond with clinical reasoning,
                                prioritisation, and safe practice. This is
                                where many candidates struggle — the questions
                                require you to think like a practising nurse.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ High-Yield Topics ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        High-Yield Topics That Appear Most Often
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <p>
                            Not all topics carry equal weight. These are the
                            areas where NCK questions cluster most heavily — and
                            where your practice time pays off the most.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Medical-Surgical Nursing
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The largest content area. Questions cover
                                cardiovascular, respiratory (especially TB),
                                neurological, renal, endocrine, and
                                gastrointestinal conditions. Expect questions
                                on nursing assessment, priority interventions,
                                and patient education.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Midwifery &amp; Maternal Health
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Consistently one of the most challenging areas.
                                Practice questions on pre-eclampsia (including
                                magnesium sulphate administration and toxicity
                                monitoring), postpartum haemorrhage (the 4 Ts),
                                antepartum haemorrhage, and neonatal
                                resuscitation.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Pharmacology
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Drug classifications, mechanisms of action,
                                side effects, nursing implications, and dosage
                                calculations. High-yield drugs include
                                anti-hypertensives, anti-TB drugs (RHZE
                                regimens), antimalarials (ACT), ARVs, and
                                insulin.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Community Health Nursing
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Kenya-specific frameworks are tested heavily:
                                KEPI immunisation schedule, IDSR disease
                                surveillance, KEPH levels of care, IMCI
                                protocols, and Kenya&rsquo;s malaria and TB
                                programme guidelines.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Paediatric Nursing
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Growth and development milestones, common
                                childhood illnesses, IMCI
                                classify-assess-treat framework, danger signs,
                                and neonatal care.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Mental Health Nursing
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Therapeutic communication, common psychiatric
                                disorders (schizophrenia, depression, bipolar),
                                psychotropic medications, crisis intervention,
                                and ethical-legal issues in Kenyan mental
                                health law.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Practice Strategy ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        How to Practise NCK Questions Effectively
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <p>
                            Practising questions is not about memorising
                            answers. It is about training your clinical
                            reasoning until it becomes automatic.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Practise with rationales, not just answer keys
                            </h3>
                            <p className="mt-2 text-slate-700">
                                When you get a question wrong, the rationale
                                for the correct answer — and why the other
                                options are wrong — is where the learning
                                happens. If you only check whether you were
                                right, you are not building the reasoning the
                                exam tests.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Focus on priority-setting questions
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Many NCK scenario questions ask for the{" "}
                                <strong>priority nursing action</strong> or the{" "}
                                <strong>best next step</strong>. These test
                                whether you can triage and prioritise, not just
                                recall facts. Practise these until the logic
                                becomes instinctive.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Use timed practice
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The NCK exam is timed. Practising without a
                                clock will not prepare you for the pace. Work
                                through sets of questions under exam-like time
                                pressure to build both speed and accuracy.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Track what you get wrong
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Your wrong answers tell you exactly where to
                                focus. Keep a record of the topics where you
                                consistently miss questions, and spend extra
                                time there.
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
                            Practise NCK Questions on Medrae
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
                            Medrae Nursing is built for Kenyan nursing students
                            preparing for the NCK exam. Instead of scattered
                            PDFs and outdated past papers, you get a structured
                            question system where every answer teaches you the
                            reasoning behind it.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Feature 1 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Unit-Based Questions — Not One Giant Pool
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae organises every question by{" "}
                                <strong>unit, condition, and topic</strong> —
                                not dumped into one big random pool. If you are
                                weak in pre-eclampsia or pulmonary TB, you jump
                                straight to that unit and drill only those
                                questions. Precision beats volume.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Detailed Rationales for Every Question
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Every question on Medrae comes with{" "}
                                <strong>
                                    explanations for why the correct answer is
                                    correct and why the others are wrong
                                </strong>
                                . That is where clinical reasoning is built —
                                the skill the NCK exam actually tests. No more
                                guessing from a bare answer key.
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
                                criteria.
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
                                pressure, before exam day.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Questions Derived From Real Exam Patterns
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae&rsquo;s questions are developed from{" "}
                                <strong>
                                    past-paper patterns and analysis of the
                                    most frequently tested topics
                                </strong>
                                , not random generation. You are practising
                                what is most likely to appear — with coverage
                                of the full syllabus, not just one
                                year&rsquo;s snapshot.
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
                                mark it as understood. Watching your mistakes
                                list shrink becomes a measurable sign of
                                progress.
                            </p>
                        </div>

                        {/* Feature 7 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Progress Tracking &amp; Unit-Level Analytics
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae shows you{" "}
                                <strong>
                                    exactly which units are strong and which
                                    need work
                                </strong>
                                , tracks your score trends over time, and
                                recommends what to practise next. No more
                                guessing whether you are ready.
                            </p>
                        </div>

                        {/* Feature 8 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Full 3-Year Curriculum Coverage
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                With{" "}
                                <strong>
                                    80+ modules and 1,000+ sub-units
                                </strong>
                                , Medrae covers the entire KRCHN programme.
                                First-year students can start practising on the
                                same platform they will use to prepare for the
                                NCK exam — building knowledge continuously
                                instead of cramming at the end.
                            </p>
                        </div>

                        {/* Feature 9 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Leaderboard, Streaks &amp; Community Motivation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae adds a{" "}
                                <strong>
                                    leaderboard, streak tracking, and community
                                    support
                                </strong>{" "}
                                to keep you consistent. Gentle competition with
                                peers and visible daily progress turn question
                                practice into a habit — not a last-minute
                                scramble.
                            </p>
                        </div>

                        {/* Feature 10 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Beyond Questions — A Complete Nursing Platform
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae is more than a question bank. It includes{" "}
                                <strong>MedTube</strong> for curated nursing
                                videos, <strong>study notes</strong> for every
                                unit, the <strong>Survival Hub</strong> for
                                housing and placement help, and{" "}
                                <strong>NursMartt</strong> for affordable
                                second-hand nursing essentials. Everything you
                                need, in one place.
                            </p>
                        </div>
                    </div>

                    {/* CTA buttons */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base"
                        >
                            Start practising on Medrae
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
                        Common Mistakes When Practising NCK Questions
                    </h2>
                    <ul className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Memorising answers instead of understanding
                                reasoning.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The NCK changes question patterns. If you only
                                memorise, you will struggle when a question is
                                phrased differently.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Only practising MCQs.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The exam also includes short-answer and
                                scenario questions. If you only practise MCQs,
                                you will not be ready for the written
                                components.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Ignoring Kenya-specific guidelines.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Questions on TB, malaria, HIV, and immunisation
                                follow Kenya&rsquo;s national protocols, not
                                generic textbook approaches.
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
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Skipping &ldquo;easy&rdquo; subjects.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Professional Practice, Research, and Leadership
                                carry guaranteed marks. Neglecting them is
                                leaving marks on the table.
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
                                How many questions are in the NCK exam?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The current online format has two papers, each
                                containing 100 multiple-choice questions. The
                                exam also includes short-answer and
                                scenario-based questions.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Are NCK past papers available?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The NCK does not officially publish past
                                papers. Many &ldquo;past papers&rdquo;
                                circulating online are outdated or inaccurate.
                                The most reliable preparation is practising
                                with high-quality, NCK-aligned questions that
                                include rationales.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What topics appear most in NCK questions?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Medical-Surgical Nursing, Midwifery,
                                Pharmacology, Community Health, Paediatric
                                Nursing, and Mental Health carry the most
                                weight. Kenya-specific guidelines (TB, malaria,
                                HIV, KEPI immunisation) are tested heavily.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How many practice questions should I do?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Quality matters more than quantity. Working
                                through questions with rationales — where you
                                understand why the correct answer is correct
                                and why the others are wrong — is more
                                effective than answering hundreds of questions
                                without review.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Can I practise NCK questions on my phone?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Yes. Medrae Nursing is built mobile-first, so
                                you can practise questions anywhere — between
                                classes, during clinical placements, or at
                                home.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ Final CTA ============ */}
                <section className="mt-12 rounded-2xl bg-blue-50 p-6 sm:p-8">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                            Ready to Practise?
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            The best way to prepare for the NCK exam is to work
                            through questions that match the exam&rsquo;s
                            format and depth — then learn from every answer.
                        </p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Medrae Nursing gives you NCK-style practice
                            questions with rationales, progress tracking, and a
                            mobile-first experience built for Kenyan nursing
                            students — from Year 1 through to your licensure
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