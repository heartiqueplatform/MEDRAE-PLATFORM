import { ArrowLeft, MessageCircle, ShieldCheck, Mail, ExternalLink, Phone, BookOpen, GraduationCap, Globe, CreditCard, Sparkles, Zap, Users, BarChart, Clock, RefreshCw, AlertCircle, CheckCircle, Award, Star, Target, TrendingUp, Search, X, Brain, LogOut, Lock, Wallet, Coins, ShieldQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { TermsButton } from "@/components/ui/TermsButton";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { useUserRole } from "@/context/UserRoleContext";
import { playSound } from "@/lib/soundManager";

const HelpCenter = () => {
    const navigate = useNavigate();
    const home = useHomeRoute();
    const { role } = useUserRole();
    const isTutor = role === "tutor";

    const handleBack = useCallback(() => {
        playSound("tap");
        if (navigator.vibrate) navigator.vibrate(20);
        navigate(home, { replace: true });
    }, [navigate, home]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    /* ────────────────────────────────────────────────────────────── */
    /*  TUTOR-ONLY CATEGORIES — rendered above the general FAQ       */
    /* ────────────────────────────────────────────────────────────── */

    const tutorCategories = [
        {
            title: "Tutor Wallet & Coins",
            icon: <Coins className="w-5 h-5 md:w-6 text-amber-500" />,
            questions: [
                {
                    question: "How does the Medrae Tutor Wallet work?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                Every tutor has a <strong>Medrae Wallet</strong> that stores coins earned from contributions. The wallet is the same surface students see — but the economics are different for you:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>You earn coins when your created quizzes are attempted by students</li>
                                <li>You earn bonus coins when your content is marked <strong>high quality</strong> by staff review</li>
                                <li>You can spend coins on premium features, curriculum unlocks, or withdraw as payout (subject to staff approval)</li>
                            </ul>
                            <div className="bg-amber-50 dark:bg-amber-900/15 p-5 rounded-2xl">
                                <p className="font-bold text-base text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-500" /> Important
                                </p>
                                <p className="text-base text-amber-700 dark:text-amber-300">
                                    Your wallet is <strong>read-only</strong> until you either create your first quiz or receive a staff payout. Once the first coin lands, the balance badge appears in your sidebar under "Earn As You Study".
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    question: "How do I create a quiz that earns coins?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                From the sidebar, tap <strong>Earn As You Study → Create Quizzes</strong> (or go directly to <code className="bg-gray-100 dark:bg-[#21262d] px-1.5 py-0.5 rounded text-sm">/contribute</code>). The flow is:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Pick a <strong>topic</strong> from the KRCHN curriculum tree</li>
                                <li>Write each question with 4 options, the correct answer, and a <strong>rationale</strong></li>
                                <li>Submit for review — our team checks accuracy and tone</li>
                                <li>Once approved, the quiz appears in the Prep Quizzes Bank</li>
                                <li>Students attempt → you earn coins per attempt (capped per quiz)</li>
                            </ol>
                            <p className="text-base text-emerald-700 dark:text-emerald-300 font-medium mt-2">
                                Tip: quizzes with rationales earn <strong>3× more</strong> coins than bare questions.
                            </p>
                        </div>
                    )
                },
                {
                    question: "What is 'Coin Admin' and why do some tutors see it?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                <strong>Coin Admin</strong> is a staff-assigned role — not something you can self-enable. If a tutor is promoted to Coin Admin, they see <code className="bg-gray-100 dark:bg-[#21262d] px-1.5 py-0.5 rounded text-sm">/wallet/admin</code> in their sidebar under <strong>Earn As You Study</strong>.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Coin Admins can <strong>manually adjust</strong> any user's balance</li>
                                <li>They can approve or reject payout requests</li>
                                <li>They can flag suspicious activity for staff review</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                If you believe you should be a Coin Admin, contact staff — the toggle is enabled per-user in the admin panel.
                            </p>
                        </div>
                    )
                },
                {
                    question: "Where do I see my coin balance?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                Your coin balance appears in <strong>three places</strong>:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Sidebar → <strong>Earn As You Study → Medrae Wallet</strong> (the badge next to it shows your live balance)</li>
                                <li>Inside the wallet page, the top card displays <strong>balance, pending, and lifetime earned</strong></li>
                                <li>On your tutor dashboard, the "Earnings" widget (if enabled by staff)</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                Balances refresh automatically when you open the sidebar. If your balance looks stale, pull-to-refresh on mobile or reload the wallet page.
                            </p>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Cohort Mistakes & Analytics",
            icon: <BarChart className="w-5 h-5 md:w-6 text-emerald-500" />,
            questions: [
                {
                    question: "How do I see where my students are struggling?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                Two surfaces are built for this — both are <strong>tutor-native</strong>:
                            </p>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl">
                                <p className="font-bold text-base text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-emerald-500" /> 1. My Mistakes (Cohort view)
                                </p>
                                <p className="text-base text-gray-600 dark:text-gray-400">
                                    Open <strong>Mistakes</strong> from the sidebar. As a tutor, you don't see your own mistakes — you see <strong>aggregated cohort misses</strong> filtered by institution. Tabs read "Cohort weak spots" and "Resolved by students".
                                </p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl">
                                <p className="font-bold text-base text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-blue-500" /> 2. Student Analytics
                                </p>
                                <p className="text-base text-gray-600 dark:text-gray-400">
                                    Open <strong>Tutor Tools → Student Analytics</strong>. Here you can drill into individual students, see their attempt history, and spot trends over time.
                                </p>
                            </div>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                Both surfaces respect your <strong>institution filter</strong> — if you teach at multiple schools, switch the filter to scope the data.
                            </p>
                        </div>
                    )
                },
                {
                    question: "How do I filter mistakes by institution?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                On the <strong>My Mistakes</strong> page (cohort view), there's an <strong>Institution Filter</strong> bar at the top. Tap it to pick the school you want to scope to.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li><strong>All institutions</strong> — shows every student in your visibility</li>
                                <li><strong>Pick a school</strong> — narrows to that cohort only</li>
                                <li>Your last selection is <strong>cached</strong> — you'll return to the same filter next time</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                The "questions worth revisiting" card at the top also respects the same filter — so the story cards + the mistake list always agree.
                            </p>
                        </div>
                    )
                },
                {
                    question: "What are the story cards on the Mistakes page?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                Those horizontally-scrolling cards are the <strong>most-failed questions in your cohort</strong> — the ones where students stumble most often. Instagram-style cards that load more as you scroll.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Badge shows <strong>×N</strong> — how many attempts missed this question</li>
                                <li>Small pill shows <strong>unique students</strong> who got it wrong</li>
                                <li>Tap a card → full breakdown with the correct answer + all students who missed it</li>
                            </ul>
                            <div className="bg-emerald-50 dark:bg-emerald-900/15 p-5 rounded-2xl mt-3">
                                <p className="font-bold text-base text-emerald-800 dark:text-emerald-200 mb-2 flex items-center gap-2">
                                    <Sparkles size={18} className="text-emerald-500" /> Teaching gold
                                </p>
                                <p className="text-base text-emerald-700 dark:text-emerald-300">
                                    If a question has <strong>15× misses from 8 different students</strong>, that's an ideal candidate for a focused class review. The page shows you exactly which students missed it.
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    question: "Can I mark a cohort mistake as resolved?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                <strong>No — that's student-only.</strong> A mistake is "resolved" when <em>the student</em> self-marks it understood. As a tutor, you see:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li><strong>Cohort weak spots</strong> — open mistakes across your institution</li>
                                <li><strong>Resolved by students</strong> — mistakes students have self-marked</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                You cannot reopen or resolve on a student's behalf. This preserves the integrity of the student's learning record — a design choice, not a limitation.
                            </p>
                            <p className="text-base text-gray-700 dark:text-gray-300">
                                What you <strong>can</strong> do: use the resolved tab to build revision sessions. Questions that many students marked resolved recently are often good candidates for a refresher quiz.
                            </p>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Institution & School Wars",
            icon: <GraduationCap className="w-5 h-5 md:w-6 text-indigo-500" />,
            questions: [
                {
                    question: "How do I set my institution as a tutor?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                Institution is set exactly the same way for tutors and students — via the <strong>School Wars</strong> card on your dashboard. Steps:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Open your dashboard → find the <strong>School Wars</strong> card</li>
                                <li>Tap <strong>Set your institution to compete</strong></li>
                                <li>Search and pick your school</li>
                                <li>Confirm — the save is instant</li>
                            </ol>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                Your institution is what scopes <strong>cohort mistakes</strong>, <strong>student analytics</strong>, and <strong>school leaderboard</strong> data. It's not just cosmetic — it's the whole tutor data model.
                            </p>
                        </div>
                    )
                },
                {
                    question: "Can I change my institution after setting it?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                <strong>Yes</strong> — tap the School Wars card again, choose a different school, and confirm. Changes take effect immediately.
                            </p>
                            <div className="bg-amber-50 dark:bg-amber-900/15 p-5 rounded-2xl">
                                <p className="font-bold text-base text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-500" /> Heads up
                                </p>
                                <p className="text-base text-amber-700 dark:text-amber-300">
                                    If you switch institutions, <strong>historical cohort data</strong> remains tied to the old institution. You'll see fresh data for the new school — old analytics don't carry over. Choose carefully.
                                </p>
                            </div>
                        </div>
                    )
                },
                {
                    question: "Can I invite other tutors to Medrae?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                Yes — and your invites count toward your school's leaderboard. From the School Wars card, tap <strong>Invite</strong> to see two options:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li><strong>Invite coursemate</strong> — for people already on Medrae</li>
                                <li><strong>Invite new campus</strong> — for colleagues who haven't signed up</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                Both generate a WhatsApp message with your school's name pre-filled and a signup link. When the invited user registers with your institution, every quiz they take adds to your school's leaderboard score.
                            </p>
                            <p className="text-base text-emerald-700 dark:text-emerald-300 font-medium">
                                Tip: encourage invitees to take a quiz in their first week — schools with more active members climb faster.
                            </p>
                        </div>
                    )
                },
                {
                    question: "How is the School Wars score calculated?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                School Wars compares <strong>institutions</strong>, not individuals, on a weekly basis. The score is a weighted average:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li><strong>Total attempts</strong> — how active your school is</li>
                                <li><strong>Average score</strong> — how accurate your school is</li>
                                <li><strong>Member count</strong> — how many students and tutors are active</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                Scores refresh weekly. A school with fewer members but higher accuracy can outrank a bigger, less accurate school — quality beats quantity.
                            </p>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Tutor Exams & CPD",
            icon: <Award className="w-5 h-5 md:w-6 text-rose-500" />,
            questions: [
                {
                    question: "How do I create an exam for my students?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                From the sidebar, open <strong>Institutional Exams → Tutor Exams</strong>. From there:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Tap <strong>Create Exam</strong></li>
                                <li>Set the title, duration, pass mark, and question count</li>
                                <li>Draw questions from the question bank by unit/topic, or add your own</li>
                                <li>Choose the candidate institution (must match your own or be a co-taught school)</li>
                                <li>Publish — candidates see it in <strong>Candidate Exams</strong> immediately</li>
                            </ol>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                After candidates submit, results appear under <strong>Exam Results</strong> with per-student breakdowns, per-question difficulty, and cohort averages.
                            </p>
                        </div>
                    )
                },
                {
                    question: "Where do I see exam results?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                <strong>Institutional Exams → Exam Results</strong>. Each published exam shows:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Number of submissions vs. expected candidates</li>
                                <li>Cohort average, highest, lowest</li>
                                <li>Per-question accuracy (spot the hardest questions)</li>
                                <li>Exportable per-student CSV (if enabled by staff)</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                Click any exam row to open the deep view — drill into a specific student to see their exact answers, time spent per question, and mistakes.
                            </p>
                        </div>
                    )
                },
                {
                    question: "How does CPD work for tutors?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                CPD (Continuing Professional Development) is available to <strong>staff-level tutors</strong> only. If your account has staff permissions, you'll see <strong>Staff Tools → CPD Dashboard</strong> in the sidebar.
                            </p>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl">
                                <p className="font-bold text-base text-gray-800 dark:text-gray-200 mb-2">What CPD gives you</p>
                                <ul className="list-disc list-inside space-y-1.5 text-base text-gray-600 dark:text-gray-400 ml-1">
                                    <li><strong>CPD Dashboard</strong> — your personal CPD progress</li>
                                    <li><strong>CPD Catalog</strong> — enroll in accredited courses</li>
                                    <li><strong>My Certificates</strong> — download accredited certificates</li>
                                    <li><strong>CPD Admin</strong> — create/manage CPD courses (staff only)</li>
                                </ul>
                            </div>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                If you don't see Staff Tools, contact staff to request CPD access. CPD is a separate track from tutoring — having a tutor role doesn't automatically grant CPD enrollment.
                            </p>
                        </div>
                    )
                },
                {
                    question: "Can I take the same assessments my students take?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                You can <strong>view</strong> the assessment library but not <strong>take</strong> assessments as a tutor. That's intentional — attempts are recorded against the user account, and a tutor's attempt would pollute the cohort analytics.
                            </p>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                What you <strong>can</strong> do on the assessments page as a tutor:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Browse the full assessment catalog</li>
                                <li>See categories and difficulty levels</li>
                                <li>Preview questions (read-only)</li>
                                <li>See aggregated cohort stats instead of your personal stats</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                                If you need to test a specific assessment yourself, ask staff to grant you a "sandbox student" test account.
                            </p>
                        </div>
                    )
                }
            ]
        }
    ];

    /* ────────────────────────────────────────────────────────────── */
    /*  GENERAL FAQ CATEGORIES (existing, unchanged + minor updates)   */
    /* ────────────────────────────────────────────────────────────── */

    const faqCategories = [
        {
            title: "Security Update & Session Issues",
            icon: <Lock className="w-5 h-5 md:w-6 text-red-500" />,
            questions: [
                {
                    question: "Why am I having trouble loading pages? (Security Update)",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">We recently upgraded our security system to keep your account safer. Because of this, some pages may not load correctly if you were already logged in before the update.</p>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl border-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-base mb-2 flex items-center gap-2"><AlertCircle size={20} className="text-red-500" /> The Simple Fix</p>
                                <p className="text-base text-gray-600 dark:text-gray-400">You just need to <strong>log out</strong> and then <strong>log back in</strong>. This refreshes your session and everything will work smoothly again.</p>
                            </div>
                            <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-2">Step-by-step:</p>
                            <ol className="list-decimal list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Click on your <strong>profile picture</strong> or the <strong>menu button</strong>.</li>
                                <li>Find and click the <strong>"Log Out"</strong> button.</li>
                                <li>You will be taken to the login screen. Enter your email and password again.</li>
                                <li>Once logged in, all pages will load normally.</li>
                            </ol>
                            <p className="text-base text-emerald-700 dark:text-emerald-300 font-medium mt-2">That's it! You only need to do this once.</p>
                        </div>
                    )
                },
                {
                    question: "I'm on a phone — how do I log out?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">If you are using your phone, the log out button is at the <strong>bottom of your screen</strong> in the footer navigation menu.</p>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl border-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-base mb-3 flex items-center gap-2"><Phone size={20} className="text-gray-500" /> On Your Phone</p>
                                <ol className="list-decimal list-inside space-y-3 text-base text-gray-600 dark:text-gray-400">
                                    <li>Look at the <strong>very bottom of your screen</strong> — you will see a row of icons.</li>
                                    <li>Tap the <strong>menu button</strong> (usually the icon with three lines ☰ or a person icon).</li>
                                    <li>A menu will open. Look for and tap <strong>"Log Out"</strong>.</li>
                                    <li>You will be taken to the login screen. Enter your email and password again.</li>
                                </ol>
                            </div>
                        </div>
                    )
                },
                {
                    question: "I logged out but still see errors. What else can I try?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Try these simple steps:</p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li><strong>Refresh the page</strong> — press the circular arrow button or pull down on your phone.</li>
                                <li><strong>Clear your browser cache</strong> — browser settings → "Clear browsing data".</li>
                                <li><strong>Try a different browser</strong> — Chrome or Firefox work best.</li>
                                <li><strong>Restart your device</strong>.</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300">If none of these work, please <a href="https://wa.me/254704473503" target="_blank" className="text-emerald-600 dark:text-emerald-400 font-bold underline">contact us on WhatsApp</a>.</p>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Subscription & Payments",
            icon: <CreditCard className="w-5 h-5 md:w-6 text-green-500" />,
            questions: [
                {
                    question: "How is the subscription paid?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Medrae uses the M-Pesa payment system for all subscriptions.</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Go to <strong>Account Settings &gt; Subscription</strong></li>
                                <li>You'll receive a Paybill number and account number</li>
                                <li>Send the payment via M-Pesa</li>
                                <li>Our system <strong>automatically verifies</strong> the payment</li>
                                <li>Your account upgrades <strong>instantly</strong></li>
                            </ol>
                        </div>
                    )
                },
                {
                    question: "Does my subscription automatically renew?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Yes! Auto-renewal is enabled by default:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Reminder <strong>3 days before</strong> renewal</li>
                                <li>Cancel anytime from Account Settings</li>
                                <li>Account stays active until end of billing cycle</li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "What are the subscription plans and pricing?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">We offer two plans:</p>
                            <ul className="list-disc list-inside space-y-3 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li><strong>Student Plan</strong> — <span className="text-emerald-600 dark:text-emerald-400 font-bold">KES 399</span><span className="block text-sm text-gray-500 dark:text-gray-400 ml-5">Perfect for students • Valid for 2 months</span></li>
                                <li><strong>Tutor Plan</strong> — <span className="text-emerald-600 dark:text-emerald-400 font-bold">KES 1999</span><span className="block text-sm text-gray-500 dark:text-gray-400 ml-5">Cohort analytics, exam creation, and cohort mistakes • Valid for 2 months</span></li>
                            </ul>
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-[#21262d] rounded-2xl border-0">
                                <p className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2"><Sparkles size={18} className="text-emerald-500" /><span>Both plans include unlimited quizzes and progress tracking.</span></p>
                            </div>
                        </div>
                    )
                },
                {
                    question: "Is M-Pesa payment secure?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Absolutely:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Official Safaricom M-Pesa APIs with bank-grade encryption</li>
                                <li>We <strong>never</strong> store your M-Pesa details</li>
                                <li>Every payment gets an M-Pesa confirmation</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Trust & Question Accuracy",
            icon: <ShieldCheck className="w-5 h-5 md:w-6 text-emerald-500" />,
            questions: [
                {
                    question: "How does the Medrae NCK Algorithm work?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Our algorithm mirrors the NCK blueprint, balancing questions across:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Medical-Surgical Nursing</li>
                                <li>Reproductive Health</li>
                                <li>Community Health</li>
                                <li>Pediatrics</li>
                                <li>Mental Health</li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "Who verifies the medical content?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Your content is in expert hands:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Board of <strong>Registered Nurse Educators</strong></li>
                                <li>Experienced Clinicians</li>
                                <li>Top nursing tutors from Kenya's premier institutions</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Study & Performance",
            icon: <BookOpen className="w-5 h-5 md:w-6 text-blue-500" />,
            questions: [
                {
                    question: "Which nursing units are most tested in NCK exams?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Based on 8+ years of NCK exam analysis:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Pharmacology: <span className="font-bold text-emerald-600">15-18%</span></li>
                                <li>Maternal-Child Health: <span className="font-bold text-emerald-600">14-16%</span></li>
                                <li>Medical-Surgical Nursing: <span className="font-bold text-emerald-600">12-15%</span></li>
                                <li>Community Health: <span className="font-bold text-emerald-600">10-12%</span></li>
                                <li>Mental Health Nursing: <span className="font-bold text-emerald-600">8-10%</span></li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "How many questions should I practice daily?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">For optimal preparation, we recommend:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li><strong>50-100</strong> questions daily</li>
                                <li>Quick 10-question sessions</li>
                                <li>Full <strong>150-question</strong> mock exams</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Account & Security",
            icon: <Globe className="w-5 h-5 md:w-6 text-purple-500" />,
            questions: [
                {
                    question: "Can I still access premium features while offline?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">
                                Yes — premium users get <strong>limited offline access</strong>.
                            </p>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl border-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-base mb-2 flex items-center gap-2">
                                    <CheckCircle size={20} className="text-emerald-500" /> Available offline for premium
                                </p>
                                <ul className="list-disc list-inside space-y-1.5 text-base text-gray-600 dark:text-gray-400 ml-1">
                                    <li>Revisit questions you've already loaded</li>
                                    <li>Review saved mistakes and rationales</li>
                                    <li>Browse previously viewed notes</li>
                                    <li>Check dashboard stats</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl border-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-base mb-2 flex items-center gap-2">
                                    <AlertCircle size={20} className="text-amber-500" /> Needs internet
                                </p>
                                <ul className="list-disc list-inside space-y-1.5 text-base text-gray-600 dark:text-gray-400 ml-1">
                                    <li>Starting a new quiz</li>
                                    <li>Loading fresh questions</li>
                                    <li>Syncing new progress</li>
                                    <li>Making a payment</li>
                                </ul>
                            </div>
                        </div>
                    )
                },
                {
                    question: "How do I reset my password?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Resetting your password is simple:</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Click <strong>"Forgot Password"</strong> on login</li>
                                <li>Enter your registered email</li>
                                <li>Receive a secure reset link</li>
                            </ol>
                        </div>
                    )
                }
            ]
        }
    ];

    /* ────────────────────────────────────────────────────────────── */
    /*  SEARCH — searches both tutor + general FAQ if tutor           */
    /* ────────────────────────────────────────────────────────────── */

    const allQuestions = useMemo(() => {
        const flat: any[] = [];
        const source = isTutor
            ? [...tutorCategories, ...faqCategories]
            : faqCategories;
        source.forEach((category, catIdx) => {
            category.questions.forEach((q, qIdx) => {
                flat.push({
                    ...q,
                    category: category.title,
                    categoryIcon: category.icon,
                    categoryIndex: catIdx,
                    questionIndex: qIdx,
                    answerText: typeof q.answer === 'string' ? q.answer : ''
                });
            });
        });
        return flat;
    }, [isTutor]);

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const query = searchQuery.toLowerCase().trim();
        return allQuestions.filter(q =>
            q.question.toLowerCase().includes(query) ||
            q.category.toLowerCase().includes(query) ||
            q.answerText.toLowerCase().includes(query)
        );
    }, [searchQuery, allQuestions]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus(); }
            if (e.key === 'Escape') { setSearchQuery(''); searchInputRef.current?.blur(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const scrollToQuestion = useCallback((catIdx: number, qIdx: number) => {
        const element = document.querySelector(`[data-category="${catIdx}"][data-question="${qIdx}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const trigger = element.querySelector('button');
            if (trigger) setTimeout(() => trigger.click(), 300);
        }
        setSearchQuery('');
        setIsSearchFocused(false);
    }, []);

    /* ────────────────────────────────────────────────────────────── */
    /*  RENDER                                                         */
    /* ────────────────────────────────────────────────────────────── */

    const renderCategory = (category: any, idx: number, offset: number = 0) => (
        <div key={`${offset}-${idx}`} className="space-y-2" data-category={offset + idx}>
            <div className="flex items-center gap-2 px-1">
                {category.icon}
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{category.title}</h3>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-[#21262d] px-2.5 py-1 rounded-full">{category.questions.length}</span>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-2">
                {category.questions.map((faq: any, fIdx: number) => (
                    <AccordionItem
                        key={fIdx}
                        value={`item-${offset + idx}-${fIdx}`}
                        className="bg-white dark:bg-[#161b22] rounded-2xl px-4 shadow-sm transition-all hover:shadow-md border-0"
                        data-category={offset + idx}
                        data-question={fIdx}
                    >
                        <AccordionTrigger className="hover:no-underline text-left text-base font-semibold py-4 text-gray-800 dark:text-gray-200">
                            <span className="flex items-center gap-2">
                                <span className="text-emerald-500 dark:text-emerald-400 text-sm font-mono">#{fIdx + 1}</span>
                                {faq.question}
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 dark:text-gray-400 leading-relaxed pb-4 pt-2 text-base">
                            {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden font-sans">
            <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
                border-b border-gray-100 dark:border-gray-800
                bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
                z-30 safe-top">
                <button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="flex items-center justify-center h-10 w-10 rounded-full
                        bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                        active:scale-95 transition-all touch-manipulation"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate">
                        Help Center
                    </h1>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {isTutor ? "Tutor guides, wallet, analytics & more" : "Search answers or browse by topic"}
                    </p>
                </div>
            </header>

            <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden no-scrollbar">
                {/* Sticky search */}
                <div className="sticky top-0 z-[100] bg-background/95 dark:bg-background/90 backdrop-blur-lg p-3 md:p-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="max-w-full mx-auto">
                        <div className="relative">
                            <Search size={20} className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={isTutor ? "Search tutor guides..." : "Search for answers..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                className="w-full pl-11 md:pl-12 pr-11 py-3 md:py-4 bg-white dark:bg-[#161b22] border-0 rounded-xl text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 shadow-sm transition-all"
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                                    <X size={18} />
                                </button>
                            )}

                            {searchResults && searchResults.length > 0 && isSearchFocused && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl max-h-[400px] overflow-y-auto z-50">
                                    <div className="p-2">
                                        <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 py-2 font-semibold">Found {searchResults.length} results</p>
                                        {searchResults.map((result, idx) => (
                                            <button key={idx} onClick={() => scrollToQuestion(result.categoryIndex, result.questionIndex)} className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors group">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0">{result.categoryIcon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-medium text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors line-clamp-2">{result.question}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">in <span className="font-medium">{result.category}</span></p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults && searchResults.length === 0 && isSearchFocused && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl z-50">
                                    <div className="p-6 text-center">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search size={28} className="text-gray-400 dark:text-gray-500" />
                                        </div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg mb-1">No results found</h4>
                                        <p className="text-base text-gray-500 dark:text-gray-400 mb-4">We couldn't find anything matching "{searchQuery}"</p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <a href="https://wa.me/254704473503" target="_blank" className="inline-flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white px-5 py-2.5 rounded-full font-medium transition-colors"><MessageCircle size={16} />WhatsApp Us</a>
                                            <a href="mailto:medraenursing@gmail.com" className="inline-flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-full font-medium transition-colors"><Mail size={16} />Email Us</a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MAIN */}
                <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-3 md:space-y-4">
                    {/* Intro */}
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="h-8 w-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center -ml-1 transition-colors"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <ShieldCheck size={16} className="text-emerald-500 dark:text-emerald-400" />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                Help Center
                            </span>
                            <span className="ml-auto text-xs text-gray-400 bg-gray-100 dark:bg-[#21262d] px-3 py-1 rounded-full">
                                24/7
                            </span>
                        </div>

                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                            {isTutor ? "Tutor guide & support" : "How can we help you today?"}
                        </h3>
                        <p className="text-base text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                            {isTutor
                                ? "Everything you need to run your cohort: wallet & coins, cohort analytics, exams, institution setup, and CPD. All answers written by our team."
                                : "Search common questions or browse by topic below. Every answer is written by our team, kept short, and updated weekly."}
                        </p>

                        <div className="grid grid-cols-3 gap-2 mt-4">
                            <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3 text-center">
                                <p className="text-base font-bold text-gray-800 dark:text-gray-200">2.3K+</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Students</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3 text-center">
                                <p className="text-base font-bold text-gray-800 dark:text-gray-200">98.7%</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pass rate</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3 text-center">
                                <p className="text-base font-bold text-gray-800 dark:text-gray-200">Weekly</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Updates</p>
                            </div>
                        </div>
                    </div>

                    {/* TUTOR-ONLY CATEGORIES */}
                    {isTutor && tutorCategories.map((cat, idx) => renderCategory(cat, idx, 0))}

                    {/* GENERAL FAQ — offset by tutor categories if tutor so search indices work */}
                    {faqCategories.map((cat, idx) =>
                        renderCategory(cat, idx, isTutor ? tutorCategories.length : 0)
                    )}

                    {/* Emergency contact */}
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl p-4 md:p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-bold text-base text-gray-800 dark:text-gray-200">Urgent technical help?</h4>
                                <p className="text-base text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                                    {isTutor
                                        ? "Trouble with wallet payouts, cohort data, or student visibility? Contact us now."
                                        : "Having trouble with payments, login, or quiz loading? Contact us now."}
                                </p>
                                <div className="flex gap-2 mt-4 flex-wrap">
                                    <a href="https://wa.me/254704473503" target="_blank" className="text-sm bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white px-3 py-2 rounded-full font-medium transition-colors inline-flex items-center gap-2"><MessageCircle size={14} />WhatsApp</a>
                                    <a href="tel:0717517371" className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-full font-medium transition-colors inline-flex items-center gap-2"><Phone size={14} />0717 517 371</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <section className="space-y-3 pt-2">
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Still have questions?</h3>
                            <p className="text-base text-gray-500 dark:text-gray-400">Our team is here to help you succeed</p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            <a href="https://wa.me/254704473503" target="_blank" className="flex flex-col items-center text-center gap-3 p-4 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md">
                                <div className="bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                    <MessageCircle size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-base text-gray-800 dark:text-gray-200">WhatsApp</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Instant chat support</p>
                                </div>
                            </a>
                            <a href="tel:0717517371" className="flex flex-col items-center text-center gap-3 p-4 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md">
                                <div className="bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                    <Phone size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-base text-gray-800 dark:text-gray-200">Direct Call</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">0717 517 371</p>
                                </div>
                            </a>
                            <a href="tel:0704473503" className="flex flex-col items-center text-center gap-3 p-4 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md">
                                <div className="bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                    <Phone size={22} />
                                </div>
                                <div>
                                    <p className="font-bold text-base text-gray-800 dark:text-gray-200">Call (Alt)</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">0704 473 503</p>
                                </div>
                            </a>
                            <a href="mailto:medraenursing@gmail.com" className="flex flex-col items-center text-center gap-3 p-4 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md min-w-0">
                                <div className="bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 p-3 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                                    <Mail size={22} />
                                </div>
                                <div className="w-full min-w-0">
                                    <p className="font-bold text-base text-gray-800 dark:text-gray-200">Email Support</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-all">medraenursing@gmail.com</p>
                                </div>
                            </a>
                        </div>
                    </section>

                    {/* Footer */}
                    <div className="text-center space-y-3 pt-6 pb-4">
                        <div className="flex items-center justify-center gap-2">
                            <Award size={16} className="text-emerald-600 dark:text-emerald-400" />
                            <p className="text-xs uppercase tracking-[2px] font-bold text-gray-500 dark:text-gray-400">Medrae Nursing Platform</p>
                        </div>
                        <TermsButton />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;