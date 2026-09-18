import { Link } from "react-router-dom";
import { useEffect } from "react";
import SeoFooter from "./SeoFooter";

/**
 * Public SEO page: Nursing Revision in Kenya
 * Route: /nursing-revision-kenya
 * Static content only. No Supabase, no data fetching.
 */
export default function NursingRevisionKenyaPage() {
    useEffect(() => {
        const SITE_URL = "https://medrae.vercel.app";
        const PAGE_PATH = "/nursing-revision-kenya";
        const CANONICAL = `${SITE_URL}${PAGE_PATH}`;

        const prevTitle = document.title;
        document.title =
            "Nursing Revision in Kenya | NCK & DCHN Exam Preparation";

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
            "A complete guide to nursing revision in Kenya. How to prepare for NCK and DCHN (formerly KRCHN) exams, use MCQs and past papers effectively, and build a revision plan that works."
        );
        setMeta(
            "property",
            "og:title",
            "Nursing Revision in Kenya | NCK & DCHN Exam Preparation"
        );
        setMeta(
            "property",
            "og:description",
            "How Kenyan nursing students approach revision for NCK and DCHN (formerly KRCHN) exams ~ active recall, MCQ practice, past-paper-style questions, and building a revision plan."
        );
        setMeta("property", "og:type", "article");
        setMeta("property", "og:url", CANONICAL);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta(
            "name",
            "twitter:title",
            "Nursing Revision in Kenya | NCK & DCHN Exam Preparation"
        );
        setMeta(
            "name",
            "twitter:description",
            "A practical nursing revision guide for Kenyan students preparing for NCK and DCHN (formerly KRCHN) licensure exams."
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
                        Nursing Revision in Kenya
                    </p>
                </div>

                {/* ============ H1 & Intro ============ */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    Nursing Revision in Kenya
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                    How to prepare effectively for NCK, DCHN (formerly KRCHN),
                    BSN, KRN, and nursing exams in Kenya ~ and where to find the
                    revision resources that actually work.
                </p>

                <section className="mt-8 space-y-4 text-[15px] leading-7 sm:text-base">
                    <p>
                        Nursing revision in Kenya is not just about reading
                        textbooks. The exams you sit ~ whether the NCK
                        licensure exam or your college assessments ~ test
                        whether you can{" "}
                        <strong>think clinically</strong>, not just recall
                        facts.
                    </p>
                    <p>
                        This hub page brings together everything you need: how
                        to approach revision, where NCK and DCHN revision
                        differ, how to use MCQs and past-paper-style questions,
                        and how to build a plan that fits around clinical
                        placements and classes.
                    </p>
                    <p>
                        Use the sections below to go deep on any part of the
                        revision process. Each links to a dedicated Medrae
                        guide.
                    </p>
                </section>

                {/* ============ How to Approach Nursing Revision ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        How to Approach Nursing Revision in Kenya
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <p>
                            The nursing students who do well are not the ones
                            who read the most. They are the ones who read{" "}
                            <strong>differently</strong>.
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Study in systems, not subjects
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Instead of reading &ldquo;Cardiovascular&rdquo;
                                as a chapter, ask: What happens when this
                                system fails? What does the nurse do first?
                                Why? This mirrors the way exam questions are
                                phrased.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Use active recall, not passive reading
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Close the book. Write what you remember. Check.
                                Repeat. This is called retrieval practice, and
                                research in health professions education shows
                                it strengthens memory far more than re-reading
                                notes. It is the single most effective study
                                technique for high-stakes exams.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Time-block, don&rsquo;t marathon
                            </h3>
                            <p className="mt-2 text-slate-700">
                                45 minutes focused, 15 minutes off. Your
                                concentration is like a muscle ~ short,
                                consistent sessions beat long, exhausting ones.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Practise questions early, not at the end
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Many students wait until they &ldquo;know
                                everything&rdquo; before practising questions.
                                This is backwards. Questions show you what you
                                do not know, so you can target your reading.
                                Start practising from day one.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ NCK Exam Revision ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        NCK Exam Revision
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            The NCK licensure exam is the final step before you
                            can practise as a nurse in Kenya. It is regulated
                            by the Nursing Council of Kenya and tests clinical
                            competence through multiple-choice questions,
                            short-answer questions, and scenario-based long
                            answers.
                        </p>
                        <p>
                            For basic cadres like DCHN (formerly KRCHN), the
                            exam is now delivered online through two papers.
                            Each paper lasts two hours, with morning sessions
                            starting at 9:00 a.m. and afternoon sessions at
                            2:00 p.m.
                        </p>
                        <p>
                            <strong>What matters most during revision:</strong>{" "}
                            Medical-Surgical Nursing and Midwifery are the most
                            content-heavy and commonly failed areas.
                            Kenya-specific guidelines ~ TB, malaria, KEPI
                            immunisation, IMCI ~ appear constantly in
                            questions. If you only use imported textbooks, you
                            will miss marks.
                        </p>
                        <p>
                            For a full breakdown of what the NCK exam covers
                            and how to structure your revision, see our{" "}
                            <Link
                                to="/nck-exam-revision"
                                className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                            >
                                NCK exam revision guide
                            </Link>
                            .
                        </p>
                    </div>
                </section>

                {/* ============ DCHN (formerly KRCHN) Revision ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        DCHN Revision <span className="block text-lg font-medium text-slate-500 mt-1 sm:text-xl">(formerly KRCHN)</span>
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            <strong>DCHN</strong> (Diploma in Community Health
                            Nursing) is the current name for the programme{" "}
                            <strong>formerly known as KRCHN</strong> (Kenya
                            Registered Community Health Nurse). It is a
                            three-year diploma that combines general nursing,
                            community health, and midwifery. The curriculum
                            and licensure path remain the same ~ only the
                            official programme name changed. If you are a DCHN
                            student, your NCK exam covers both clinical and
                            community-based content.
                        </p>
                        <p>
                            <strong>Common DCHN revision mistakes:</strong>{" "}
                            Ignoring &ldquo;easy&rdquo; subjects like
                            Professional Practice and Leadership; memorising
                            answers instead of reasoning; and studying
                            community health from generic textbooks instead of
                            Kenya&rsquo;s national frameworks.
                        </p>
                        <p>
                            For the full DCHN revision strategy, including
                            high-yield topics and a phased plan, see our{" "}
                            <Link
                                to="/krchn-revision"
                                className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                            >
                                DCHN (formerly KRCHN) revision guide
                            </Link>
                            .
                        </p>
                    </div>
                </section>

                {/* ============ Nursing Questions and MCQs ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Nursing Questions and MCQs
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            Practising questions is where real learning
                            happens. But not all practice is equal.
                        </p>
                        <p>
                            <strong>
                                Practise with rationales, not just answer keys.
                            </strong>{" "}
                            When you get a question wrong, the explanation for
                            why the correct answer is correct ~ and why the
                            others are wrong ~ is where the learning happens.
                        </p>
                        <p>
                            <strong>
                                Focus on priority-setting questions.
                            </strong>{" "}
                            Many NCK questions ask for the{" "}
                            <em>priority nursing action</em> or the{" "}
                            <em>best next step</em>. These test clinical
                            reasoning, not recall.
                        </p>
                        <p>
                            For more on NCK question formats and high-yield
                            topics, see our{" "}
                            <Link
                                to="/nck-exam-questions"
                                className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                            >
                                NCK exam questions guide
                            </Link>
                            .
                        </p>
                    </div>
                </section>

                {/* ============ Using Past Papers ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Using Past Papers Effectively
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            One important fact:{" "}
                            <strong>
                                the NCK does not officially publish past papers.
                            </strong>{" "}
                            What circulates online are recalled questions or
                            compilations ~ not official releases.
                        </p>
                        <p>
                            That does not make them useless. They show you the{" "}
                            <strong>style</strong> of questioning and the
                            topics that repeat. But they are a revision tool,
                            not a shortcut.
                        </p>
                        <p>
                            <strong>The trap:</strong> memorising past paper
                            answers. The NCK exam tests clinical reasoning. If
                            you memorise answers, you will fail when the
                            scenario is worded differently.
                        </p>
                        <p>
                            For a full guide on how to use past-paper-style
                            questions properly, see our{" "}
                            <Link
                                to="/nck-past-papers"
                                className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                            >
                                NCK past papers guide
                            </Link>
                            .
                        </p>
                    </div>
                </section>

                {/* ============ Building a Revision Plan ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Building a Nursing Revision Plan
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 1: Diagnose Your Gaps (First 2–3 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Sit a diagnostic assessment across all papers
                                before you start reading. Score yourself
                                honestly and rank your subjects from weakest to
                                strongest. This ranking becomes your study
                                priority.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 2: Content by Priority (Middle 5–6 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Attack your weakest area first. Work through
                                body systems rather than isolated diseases. For
                                each system, review the normal physiology
                                briefly, study the commonly tested disorders,
                                then immediately practise questions.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Phase 3: Practice Under Exam Conditions (Final
                                3–4 Weeks)
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Timed mock exams are non-negotiable. The NCK
                                exam is digital ~ practise on screen, not just
                                on paper. Work through full papers within the
                                time limit and review every wrong answer.
                            </p>
                        </div>
                    </div>
                    <p className="mt-4 text-[15px] leading-7 sm:text-base">
                        For the practical side of preparation ~ registration,
                        the mandatory rehearsal, equipment requirements, and
                        exam-day rules ~ see our{" "}
                        <Link
                            to="/nck-exam-preparation"
                            className="font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:decoration-slate-900"
                        >
                            NCK exam preparation guide
                        </Link>
                        .
                    </p>
                </section>

                {/* ============ Common Revision Mistakes ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Common Nursing Revision Mistakes
                    </h2>
                    <ul className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Passive reading instead of active recall.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Re-reading notes feels productive but does not
                                build the retrieval strength exams require.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Only practising MCQs.
                            </strong>{" "}
                            <span className="text-slate-700">
                                The NCK exam includes short-answer and scenario
                                questions. If you only practise multiple
                                choice, you will not be ready for the written
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
                                imported textbook approaches.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Spreading revision equally.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Medical-Surgical and Midwifery are heavier and
                                more commonly failed. They need more time.
                            </span>
                        </li>
                        <li className="rounded-xl bg-slate-50 p-4">
                            <strong className="text-slate-900">
                                Marathon studying without breaks.
                            </strong>{" "}
                            <span className="text-slate-700">
                                Short, focused sessions with breaks beat long,
                                exhausting ones.
                            </span>
                        </li>
                    </ul>
                </section>

                {/* ============ How Medrae Supports Nursing Revision ============ */}
                <section className="mt-12">
                    <div className="text-center">
                        <img
                            src="/pwa-512x512.png"
                            alt="Medrae Nursing"
                            className="mx-auto h-12 w-12 rounded-xl object-contain"
                        />
                        <h2 className="mt-4 text-2xl font-semibold text-slate-900 sm:text-3xl">
                            How Medrae Supports Nursing Revision in Kenya
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
                            Medrae Nursing is not just a question bank. It is a
                            complete revision system built around the DCHN
                            (formerly KRCHN), BSN, KRN and NCK syllabus ~
                            designed so a student can use it from Year 1 all
                            the way to the licensure exam.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Feature 1 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Complete 3-Year Nursing Curriculum
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae covers all three years of the DCHN
                                (formerly KRCHN) programme ~ organised by year,
                                semester, module, unit, and topic. With over{" "}
                                <strong>1,000+ sub-units</strong> across{" "}
                                <strong>80+ modules</strong>, you can keep
                                practising continuously throughout your
                                studies, not just cram at the end. First-year
                                students can start the same platform they will
                                use to prepare for the NCK exam.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Unit-Based Question Bank
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Unlike apps that dump questions into one big
                                pool, Medrae organises every question by{" "}
                                <strong>unit, condition, and topic</strong>. If
                                you are weak in, say, pre-eclampsia or
                                pulmonary TB, you jump straight to that unit
                                and practise only those questions ~ instead of
                                scrolling through unrelated content.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Flashcards, Micro-Cards &amp; Visual Memory
                                Aids
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Between questions, Medrae inserts{" "}
                                <strong>flashcards and micro-cards</strong> ~
                                short bursts of key facts, mnemonics, and
                                images that help you retain information longer.
                                Visual memory anchors make clinical facts
                                stick, especially for pharmacology, anatomy,
                                and diagnostic criteria.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                DigiProctor-Style Exam Simulation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                The NCK exam is now computer-based. Medrae
                                gives you a{" "}
                                <strong>DigiProctor-style practice mode</strong>{" "}
                                with timed sessions, question flagging, and
                                real exam interface layout. You practise under
                                the same pressure you will face on exam day ~
                                so the real thing feels familiar, not
                                frightening.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Notes and Exam-Derived Content
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae provides <strong>study notes</strong>{" "}
                                and <strong>curated resources</strong>{" "}
                                alongside its question bank. Content is derived
                                from real past-paper patterns and analysis of
                                the most frequently tested questions ~ so you
                                are studying what is likely to appear, not what
                                is unlikely.
                            </p>
                        </div>

                        {/* Feature 6 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                My Mistakes ~ Error Tracking That Cleans Itself
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Every question you get wrong is stored in your{" "}
                                <strong>My Mistakes</strong> page. To clear a
                                mistake, you must go back, re-read the
                                question, and mark it as understood ~ a small
                                act that reinforces learning. Watching your
                                mistakes list shrink becomes a source of
                                motivation in itself.
                            </p>
                        </div>

                        {/* Feature 7 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Leaderboard, Streaks &amp; Community Motivation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae includes a{" "}
                                <strong>
                                    leaderboard, streak tracking, and community
                                    features
                                </strong>{" "}
                                that keep you consistent. Studying alone is
                                hard. Seeing your progress, competing gently
                                with peers, and maintaining a streak is what
                                makes revision a habit rather than a sprint.
                            </p>
                        </div>

                        {/* Feature 8 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Survival Hub &amp; Student Wellness
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae is not only about exam content. The{" "}
                                <strong>Survival Hub</strong> helps students
                                find housing, hospital placements, exam
                                centres, and exam buddies ~ reducing the stress
                                that comes with nursing school logistics.
                                Daily wellness check-ins and community support
                                round out the platform, because student
                                wellbeing is a priority.
                            </p>
                        </div>

                        {/* Feature 9 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                NursMartt ~ Second-Hand Nursing Essentials
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Need uniforms, stethoscopes, or study materials
                                at a lower cost?{" "}
                                <strong>NursMartt</strong> is Medrae&rsquo;s
                                marketplace for second-hand nursing items ~ so
                                students can save money on essentials without
                                compromising on quality.
                            </p>
                        </div>

                        {/* Feature 10 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                MedTube ~ Curated Nursing Videos
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                <strong>MedTube</strong> offers thousands of
                                curated nursing education videos ~ no ads, no
                                distractions, organised by topic. If you learn
                                better through visuals and explanations,
                                MedTube is a study tool in the same place as
                                your question bank.
                            </p>
                        </div>
                    </div>

                    {/* CTA buttons */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base"
                        >
                            Start revising on Medrae
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
                                How many papers does the NCK exam have?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The Council states that basic cadres sit 4
                                individual papers, though the current online
                                format consolidates content into 2 papers. Each
                                paper lasts two hours.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                What is the best way to revise for nursing
                                exams in Kenya?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Active recall ~ closing your notes and testing
                                yourself from memory ~ is the most effective
                                technique. Combine this with question practice
                                that includes rationales, and time-block your
                                study sessions rather than marathon-reading.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Are NCK past papers available?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The NCK does not officially publish past
                                papers. Materials circulating online are
                                recalled questions or compilations. They are
                                useful for understanding question style, but
                                should not be used as a substitute for
                                structured revision.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How long should I revise before the NCK exam?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                A structured 10–12 week revision plan works
                                well for most students: 2–3 weeks for diagnosis
                                and gap-filling, 5–6 weeks for content by
                                priority, and 3–4 weeks for timed mock exams
                                and final review.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Can I practise NCK questions on my phone?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Yes. Medrae Nursing is built mobile-first, so
                                you can practise questions anywhere ~ between
                                classes, during placements, or at home. Start
                                at{" "}
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
                            Ready to Start Your Nursing Revision?
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Effective nursing revision in Kenya is not about
                            reading more ~ it is about practising the right
                            way. Test yourself, learn from rationales, and
                            track your weak areas.
                        </p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Medrae Nursing gives you the questions, rationales,
                            and progress tracking you need ~ from Year 1 of
                            your training through to your NCK licensure exam,
                            for DCHN, BSN, KRN and all cadres.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base"
                        >
                            Start your nursing revision
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
            <SeoFooter />
        </main>
    );
}