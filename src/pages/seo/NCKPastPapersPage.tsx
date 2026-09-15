import { Link } from "react-router-dom";
import { useEffect } from "react";
import SeoFooter from "./SeoFooter";


/**
 * Public SEO page: NCK Past Papers
 * Route: /nck-past-papers
 * Static content only. No Supabase, no data fetching.
 */
export default function NCKPastPapersPage() {
    useEffect(() => {
        const SITE_URL = "https://medrae.vercel.app";
        const PAGE_PATH = "/nck-past-papers";
        const CANONICAL = `${SITE_URL}${PAGE_PATH}`;

        const prevTitle = document.title;
        document.title =
            "NCK Past Papers | How to Use Them for Revision (Kenya)";

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
            "Understand NCK past papers and how to use them for revision. What they reveal about the exam, common traps to avoid, and better ways to practise for Kenyan nursing students."
        );
        setMeta(
            "property",
            "og:title",
            "NCK Past Papers | How to Use Them for Revision (Kenya)"
        );
        setMeta(
            "property",
            "og:description",
            "What NCK past papers actually show, why they are not a shortcut, and how to build real exam readiness."
        );
        setMeta("property", "og:type", "article");
        setMeta("property", "og:url", CANONICAL);
        setMeta("name", "twitter:card", "summary_large_image");
        setMeta(
            "name",
            "twitter:title",
            "NCK Past Papers | How to Use Them for Revision (Kenya)"
        );
        setMeta(
            "name",
            "twitter:description",
            "A practical guide to using past-paper-style questions for NCK revision in Kenya."
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
                        NCK Past Papers
                    </p>
                </div>

                {/* ============ H1 & Intro ============ */}
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    NCK Past Papers
                </h1>
                <p className="mt-3 text-base text-slate-600 sm:text-lg">
                    What past papers can — and cannot — do for your NCK revision,
                    and how to use them properly.
                </p>

                <section className="mt-8 space-y-4 text-[15px] leading-7 sm:text-base">
                    <p>
                        If you are preparing for the NCK licensure exam, you have
                        probably heard someone say, &ldquo;Just do the past
                        papers.&rdquo; It sounds like a shortcut. It is not.
                    </p>
                    <p>
                        Past papers are useful — but only if you understand what
                        they actually are and how to use them. This page explains
                        that clearly, so you do not waste weeks on the wrong
                        strategy.
                    </p>
                    <p>
                        One important note before we go further:{" "}
                        <strong>
                            the NCK does not officially publish past papers.
                        </strong>{" "}
                        Any papers circulating online are reconstructions,
                        compilations, or recalled questions — not official
                        releases from the Council. That distinction matters.
                    </p>
                </section>

                {/* ============ What Past Papers Actually Are ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        What NCK Past Papers Actually Are
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            The Nursing Council of Kenya does not publish its
                            examination papers after each sitting. Unlike KCSE or
                            university exams where past papers are officially
                            released, NCK papers are not made public by the
                            Council.
                        </p>
                        <p>
                            What circulates online and in study groups are
                            typically:
                        </p>
                        <ul className="list-disc space-y-2 pl-5 text-slate-700">
                            <li>
                                <strong>Recalled questions</strong> from
                                candidates who sat previous exams — often
                                incomplete or slightly altered
                            </li>
                            <li>
                                <strong>Compilations</strong> from various
                                sources, sometimes labelled as &ldquo;NCK past
                                papers&rdquo; without verification
                            </li>
                            <li>
                                <strong>Old paper-based format questions</strong>{" "}
                                from before the online transition — useful for
                                content but not for format practice
                            </li>
                        </ul>
                        <p>
                            This does not make them useless. It means you need to
                            treat them as <strong>revision material</strong>, not
                            as a definitive preview of what you will see.
                        </p>
                    </div>
                </section>

                {/* ============ What Past Papers Reveal ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        What Past Papers Can Reveal (When Used Correctly)
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <p>
                            Even without official releases, the patterns in
                            circulated past papers tell you something useful:
                        </p>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                The topics that repeat
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Certain clinical areas appear again and again —
                                midwifery emergencies (postpartum haemorrhage,
                                pre-eclampsia), TB management, pharmacology
                                interactions, and community health protocols.
                                Seeing these patterns helps you prioritise.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                The style of questioning
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Past papers show you how the NCK phrases
                                questions — often asking for the{" "}
                                <strong>priority nursing action</strong> or the{" "}
                                <strong>best next step</strong>. This trains you
                                to read questions carefully and think
                                clinically.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                The depth expected
                            </h3>
                            <p className="mt-2 text-slate-700">
                                They show you whether a topic is tested at a
                                recall level or an application level. This helps
                                you calibrate how deeply to study each area.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ The Trap ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        The Trap: Memorising Past Paper Answers
                    </h2>
                    <div className="mt-5 space-y-4 text-[15px] leading-7 sm:text-base">
                        <p>
                            This is the single biggest mistake students make with
                            past papers.
                        </p>
                        <p>
                            The NCK exam tests{" "}
                            <strong>clinical reasoning</strong>, not
                            memorisation. If you memorise that &ldquo;the answer
                            to the PPH question is oxytocin,&rdquo; you will
                            fail when the exam presents a different scenario
                            where the priority is uterine massage, or where the
                            answer choices are worded differently.
                        </p>
                        <p>
                            The exam is also delivered online with a large
                            question bank. Questions are not simply recycled
                            year after year. Memorising answers from a 2019
                            paper will not help you on a 2026 exam question on
                            the same topic.
                        </p>
                        <p>
                            <strong>What to do instead:</strong> When you work
                            through a past paper question, ask yourself:{" "}
                            <em>
                                Why is this the answer? What principle does it
                                test? How would this change if the scenario were
                                slightly different?
                            </em>
                        </p>
                    </div>
                </section>

                {/* ============ How to Use Them Properly ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        How to Use Past Papers Properly
                    </h2>
                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                1. Use them as a diagnostic, not a study guide
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Sit a past paper early in your revision — before
                                you feel ready. Treat it as a diagnostic
                                assessment. The topics you get wrong are your
                                study priorities.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                2. Focus on the reasoning, not the answer
                            </h3>
                            <p className="mt-2 text-slate-700">
                                For every question, write down why the correct
                                answer is correct and why the others are wrong.
                                If you cannot explain it, you do not understand
                                it yet.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                3. Practise under exam conditions
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Time yourself. Do not pause to look things up.
                                The NCK exam is timed, and the pressure of
                                answering 100 questions in two hours is
                                different from casually working through a PDF.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                4. Do not rely on one source
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Past papers are one input. They are not a
                                complete revision strategy. Use them alongside
                                structured content review and a large bank of
                                practice questions that cover the full syllabus.
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
                            Better Than Scattered Past Papers
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-600 sm:text-base">
                            Old PDFs and unverified &ldquo;past papers&rdquo;
                            can only take you so far. Medrae Nursing gives you
                            what past papers cannot: a structured, NCK-aligned
                            revision system that teaches the reasoning behind
                            every answer — and tracks your progress from Year 1
                            of your training all the way to the licensure exam.
                        </p>
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Feature 1 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                A Real Question Bank — Not Just One Year&rsquo;s
                                Questions
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Past papers only cover what happened to appear
                                in one sitting. Medrae gives you{" "}
                                <strong>
                                    thousands of NCK-style questions
                                </strong>{" "}
                                across every core topic — Medical-Surgical,
                                Midwifery, Pharmacology, Community Health,
                                Paediatrics, Mental Health — so you are covered
                                even if a topic was not tested last year.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Unit-Based Practice — Jump to the Exact Weak
                                Area
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Questions in Medrae are organised by{" "}
                                <strong>unit, condition, and topic</strong>, not
                                dumped into one big pool. If past papers reveal
                                that you keep missing pre-eclampsia questions,
                                you jump straight to that unit and drill only
                                those — instead of scrolling through unrelated
                                material.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Detailed Rationales for Every Question
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Past papers usually give you an answer key and
                                stop. Medrae gives you{" "}
                                <strong>
                                    explanations for why the correct answer is
                                    correct and why the others are wrong
                                </strong>
                                . That is where clinical reasoning is built —
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
                                throughout practice — short bursts of key
                                facts, mnemonics, and images that help clinical
                                information stick. Unlike a past paper PDF, you
                                are actively reinforcing memory while you
                                answer.
                            </p>
                        </div>

                        {/* Feature 5 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                DigiProctor-Style Exam Simulation
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Past papers cannot prepare you for a
                                computer-based exam. Medrae gives you a{" "}
                                <strong>
                                    DigiProctor-style timed simulation
                                </strong>{" "}
                                with the same layout, question flagging, and
                                time pressure you will face on the real NCK
                                platform. You train on-screen, under pressure,
                                before exam day.
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
                                progress — something a static PDF can never do.
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
                                recommends what to study next. Past papers give
                                you a one-off score; Medrae gives you a
                                continuous picture of your readiness.
                            </p>
                        </div>

                        {/* Feature 8 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Content Derived From Real Exam Patterns
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

                        {/* Feature 9 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Community, Leaderboard &amp; Streaks
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Studying from a lone PDF is isolating. Medrae
                                adds a{" "}
                                <strong>
                                    leaderboard, streak tracking, and community
                                    support
                                </strong>{" "}
                                so you stay consistent. Gentle competition and
                                visible progress are what turn revision into a
                                daily habit instead of a last-minute scramble.
                            </p>
                        </div>

                        {/* Feature 10 */}
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Beyond Questions — A Complete Nursing Platform
                            </h3>
                            <p className="mt-2 text-[14px] leading-7 text-slate-700">
                                Medrae is more than revision. It includes{" "}
                                <strong>MedTube</strong> for curated nursing
                                videos, <strong>study notes</strong> for every
                                unit, the <strong>Survival Hub</strong> for
                                housing and placement help, and{" "}
                                <strong>NursMartt</strong> for affordable
                                second-hand nursing essentials. Everything a
                                nursing student needs, from Year 1 to
                                licensure, in one place.
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

                {/* ============ FAQ ============ */}
                <section className="mt-12">
                    <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                        Frequently Asked Questions
                    </h2>

                    <div className="mt-5 space-y-5 text-[15px] leading-7 sm:text-base">
                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Does the NCK release past papers?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                No. The Nursing Council of Kenya does not
                                officially publish its examination papers.
                                Papers circulating online are recalled
                                questions, compilations, or old paper-based
                                format questions — not official NCK releases.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Are NCK past papers still relevant with the
                                online exam?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                The content is still relevant — the topics and
                                clinical areas tested have not changed. But the
                                format has. The exam is now online with
                                multiple-choice and scenario questions. Use
                                past papers for content revision, but practise
                                the online format separately.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                How many years of past papers should I do?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                It is not about quantity. Doing five papers
                                with deep review of every wrong answer is more
                                valuable than rushing through twenty without
                                understanding. Start with recent papers, then
                                go back if you have time.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Can I pass the NCK exam by only doing past
                                papers?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                No. Past papers are a revision tool, not a
                                complete preparation strategy. The NCK exam
                                tests clinical reasoning across the full
                                syllabus. You need structured content review
                                and a broad range of practice questions, not
                                just memorised past paper answers.
                            </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-5">
                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                Where can I get quality NCK practice questions?
                            </h3>
                            <p className="mt-2 text-slate-700">
                                Medrae Nursing offers NCK-style practice
                                questions with rationales, covering all core
                                topics across both papers. Start practising at{" "}
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
                            Ready to Practise Properly?
                        </h2>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Past papers show you what the exam looks like. But
                            passing the NCK exam requires clinical reasoning —
                            the ability to think through a scenario and choose
                            the priority action.
                        </p>
                        <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-base">
                            Medrae Nursing helps you build that reasoning with
                            NCK-style questions, rationales, and progress
                            tracking built for Kenyan nursing students — from
                            Year 1 to your licensure exam.
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