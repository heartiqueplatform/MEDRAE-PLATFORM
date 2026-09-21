import { ArrowLeft, MessageCircle, ShieldCheck, Mail, ExternalLink, Phone, BookOpen, GraduationCap, Globe, CreditCard, Sparkles, Zap, Users, BarChart, Clock, RefreshCw, AlertCircle, CheckCircle, Award, Star, Target, TrendingUp, Search, X, Brain, LogOut, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { TermsButton } from "@/components/ui/TermsButton";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const HelpCenter = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

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
                            <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-2">Step-by-step (even if you're not a computer person):</p>
                            <ol className="list-decimal list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li>Click on your <strong>profile picture</strong> or the <strong>menu button</strong> (usually at the top right corner).</li>
                                <li>Find and click the <strong>"Log Out"</strong> button.</li>
                                <li>You will be taken to the login screen. Enter your email and password again.</li>
                                <li>Once logged in, all pages will load normally.</li>
                            </ol>
                            <p className="text-base text-emerald-700 dark:text-emerald-300 font-medium mt-2">That's it! You only need to do this once.</p>
                        </div>
                    )
                },
                {
                    question: "I'm on a phone — how do I log out? (Bottom Menu Button)",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">If you are using your phone, the log out button is at the <strong>bottom of your screen</strong> in the footer navigation menu. Here's exactly what to do:</p>
                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl border-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-base mb-3 flex items-center gap-2"><Phone size={20} className="text-gray-500" /> On Your Phone</p>
                                <ol className="list-decimal list-inside space-y-3 text-base text-gray-600 dark:text-gray-400">
                                    <li>Look at the <strong>very bottom of your screen</strong> — you will see a row of icons (this is the footer navigation menu).</li>
                                    <li>Tap the <strong>menu button</strong> (usually the icon with three lines ☰ or a person icon).</li>
                                    <li>A menu will open. Look for and tap <strong>"Log Out"</strong>.</li>
                                    <li>You will be taken to the login screen. Enter your email and password again.</li>
                                    <li>Once logged in, all pages will load normally again.</li>
                                </ol>
                            </div>
                            <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-2">On a laptop or computer?</p>
                            <p className="text-base text-gray-700 dark:text-gray-300">Look at the <strong>top right corner</strong> of the page for your profile picture or menu button, then click <strong>"Log Out"</strong>.</p>
                            <p className="text-base text-emerald-700 dark:text-emerald-300 font-medium mt-2">That's it! You only need to do this once.</p>
                        </div>
                    )
                },
                {
                    question: "I logged out but still see errors. What else can I try?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">If logging out and back in didn't fix it, try these simple steps:</p>
                            <ul className="list-disc list-inside space-y-2 text-base text-gray-700 dark:text-gray-300 ml-2">
                                <li><strong>Refresh the page</strong> — Press the circular arrow button on your browser or pull down on your phone screen.</li>
                                <li><strong>Clear your browser cache</strong> — Go to your browser settings and look for "Clear browsing data" or "Clear cache".</li>
                                <li><strong>Try a different browser</strong> — Chrome or Firefox work best with Medrae.</li>
                                <li><strong>Restart your device</strong> — Sometimes a simple restart fixes everything.</li>
                            </ul>
                            <p className="text-base text-gray-700 dark:text-gray-300">If none of these work, please <a href="https://wa.me/254704473503" target="_blank" className="text-emerald-600 dark:text-emerald-400 font-bold underline">contact us on WhatsApp</a> and we'll help you personally.</p>
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
                            <p className="text-base leading-relaxed">Medrae uses the M-Pesa payment system for all subscriptions. Here's how it works:</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Go to <strong>Account Settings &gt; Subscription</strong></li>
                                <li>You'll receive a Paybill number and account number</li>
                                <li>Send the payment via M-Pesa</li>
                                <li>Our system <strong>automatically verifies</strong> the payment</li>
                                <li>Your account upgrades <strong>instantly</strong> — no manual intervention needed!</li>
                            </ol>
                        </div>
                    )
                },
                {
                    question: "Does my subscription automatically renew?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Yes! Your Medrae subscription is designed for seamless continuity:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Auto-renewal at the end of each billing period</li>
                                <li>Reminder <strong>3 days before</strong> renewal</li>
                                <li>Cancel anytime from Account Settings</li>
                                <li>Account stays active until the current billing cycle ends</li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "What happens when I upgrade from free to premium?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Your upgrade is <strong>instant!</strong> As soon as M-Pesa confirms payment:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Unlimited quiz attempts</li>
                                <li>Advanced performance analytics</li>
                                <li>Access to <strong>6,000+</strong> NCK-aligned questions</li>
                                <li>Priority support</li>
                                <li>Downloadable study materials</li>
                            </ul>
                            <p className="mt-2 text-emerald-600 dark:text-emerald-400 text-base">✨ Changes reflect immediately on your dashboard!</p>
                        </div>
                    )
                },
                {
                    question: "What are the subscription plans and pricing?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">We offer affordable plans designed for every nursing student:</p>
                            <ul className="list-disc list-inside space-y-3 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li><strong>Student Plan</strong> — <span className="text-emerald-600 dark:text-emerald-400 font-bold">KES 399</span><span className="block text-sm text-gray-500 dark:text-gray-400 ml-5">Perfect for students • Valid for 2 months</span></li>
                                <li><strong>Tutor Plan</strong> — <span className="text-emerald-600 dark:text-emerald-400 font-bold">KES 1999</span><span className="block text-sm text-gray-500 dark:text-gray-400 ml-5">Advanced features for educators • Valid for 2 months</span></li>
                            </ul>
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-[#21262d] rounded-2xl border-0">
                                <p className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2"><Sparkles size={18} className="text-emerald-500" /><span>Both plans include instant access, unlimited quizzes, and progress tracking!</span></p>
                            </div>
                        </div>
                    )
                },
                {
                    question: "Is M-Pesa payment secure?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Absolutely! We prioritize your financial security:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Official Safaricom M-Pesa APIs with bank-grade encryption</li>
                                <li>We <strong>never</strong> store your M-Pesa details</li>
                                <li>All transactions are protected</li>
                                <li>You receive an official M-Pesa confirmation for every payment</li>
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
                            <p className="text-base leading-relaxed">Our proprietary algorithm mirrors the NCK blueprint, balancing questions across:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Medical-Surgical Nursing</li>
                                <li>Reproductive Health</li>
                                <li>Community Health</li>
                                <li>Pediatrics</li>
                                <li>Mental Health</li>
                            </ul>
                            <p className="mt-2 text-base text-gray-700 dark:text-gray-300">The algorithm <strong>adapts to your performance</strong>, focusing on areas needing improvement.</p>
                        </div>
                    )
                },
                {
                    question: "Where do the questions come from?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">We source from three pillars of excellence:</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Verified NCK Past Papers from the last <strong>10 years</strong></li>
                                <li>Current clinical guidelines from major teaching hospitals</li>
                                <li>High-yield units from international licensing exams (NCLEX-style)</li>
                            </ol>
                            <p className="mt-2 text-base text-gray-700 dark:text-gray-300">Every question is <strong>meticulously researched</strong> and updated weekly.</p>
                        </div>
                    )
                },
                {
                    question: "Who verifies the medical content?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Your learning is in expert hands:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Board of <strong>Registered Nurse Educators</strong></li>
                                <li>Experienced Clinicians</li>
                                <li>Top nursing tutors from Kenya's premier institutions</li>
                            </ul>
                            <p className="mt-2 text-base text-gray-700 dark:text-gray-300">Every answer aligns with <strong>evidence-based practice</strong> and NCK marking schemes.</p>
                        </div>
                    )
                },
                {
                    question: "How often is the question bank updated?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">We refresh our content <strong>weekly</strong> based on:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Recent NCK exam patterns</li>
                                <li>New Ministry of Health guidelines</li>
                                <li>Community feedback</li>
                                <li>Emerging healthcare trends</li>
                            </ul>
                            <p className="mt-2 text-base text-gray-700 dark:text-gray-300">You always study the <strong>most current</strong> material.</p>
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
                    question: "Can I practice specific units I am weak in?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Absolutely! Medrae offers focused practice:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Filter quizzes by specific subjects</li>
                                <li><strong>"My Mistakes"</strong> feature identifies weak areas</li>
                                <li>AI creates <strong>personalized practice sessions</strong></li>
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
                                Yes — premium users get <strong>limited offline access</strong> so you can keep studying even without internet.
                            </p>

                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl border-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-base mb-2 flex items-center gap-2">
                                    <CheckCircle size={20} className="text-emerald-500" /> Available offline for premium
                                </p>
                                <ul className="list-disc list-inside space-y-1.5 text-base text-gray-600 dark:text-gray-400 ml-1">
                                    <li>Revisit questions you've already loaded</li>
                                    <li>Review your saved mistakes and rationales</li>
                                    <li>Browse previously viewed study notes</li>
                                    <li>Check your progress and dashboard stats</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 dark:bg-[#21262d] p-5 rounded-2xl border-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-base mb-2 flex items-center gap-2">
                                    <AlertCircle size={20} className="text-amber-500" /> Needs internet
                                </p>
                                <ul className="list-disc list-inside space-y-1.5 text-base text-gray-600 dark:text-gray-400 ml-1">
                                    <li>Starting a brand-new quiz</li>
                                    <li>Loading fresh questions you haven't opened before</li>
                                    <li>Syncing new progress, mistakes, or analytics</li>
                                    <li>Making or renewing a payment</li>
                                </ul>
                            </div>

                            <p className="text-base text-gray-700 dark:text-gray-300">
                                Your progress is saved locally on your device and <strong>syncs automatically</strong> the moment you reconnect — nothing is lost.
                            </p>
                            <p className="text-base text-gray-700 dark:text-gray-300">
                                <strong>Free users</strong> will see a friendly prompt asking them to reconnect to continue. This keeps the app fast and prevents broken states on a weak connection.
                            </p>
                        </div>
                    )
                },
                {
                    question: "Can I use Medrae on my phone and laptop?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Yes! Medrae is fully responsive:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Works on smartphones, tablets, and laptops</li>
                                <li><strong>One active session</strong> for security</li>
                            </ul>
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
                },
                {
                    question: "The quiz isn't loading correctly. What should I do?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">Most loading issues can be resolved quickly:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Click <strong>"Refresh"</strong> on your dashboard</li>
                                <li>Clear browser cache</li>
                                <li>Try Chrome or Firefox</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Tips & Success Strategies",
            icon: <Award className="w-5 h-5 md:w-6 text-rose-500" />,
            questions: [
                {
                    question: "What are the best study strategies for NCK?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">From our successful students:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li>Practice <strong>50-70 questions daily</strong></li>
                                <li>Review rationales even for correct answers</li>
                                <li>Focus on weak areas using <strong>"My Mistakes"</strong></li>
                                <li>Take weekly full-length mocks</li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "How can I reduce exam anxiety?",
                    answer: (
                        <div className="space-y-3">
                            <p className="text-base leading-relaxed">We've built tools to help you stay calm:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-base text-gray-700 dark:text-gray-300">
                                <li><strong>"Exam Simulator"</strong> mode builds confidence</li>
                                <li>Timed practice sessions daily</li>
                                <li><strong>7-day pre-exam checklist</strong></li>
                            </ul>
                        </div>
                    )
                }
            ]
        }
    ];

    const allQuestions = useMemo(() => {
        const flat: any[] = [];
        faqCategories.forEach((category, catIdx) => {
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
    }, []);

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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-transparent pb-20 md:pb-24 font-sans">

            {/* Sticky Search Bar */}
            <div className="sticky -top-4 z-[100] rounded-xl bg-gray-50/95 dark:bg-[#0d1117]/90 backdrop-blur-lg p-4 md:p-5">
                <div className="max-w-full mx-auto px-0 md:px-2 lg:px-6">
                    <div className="relative">
                        <div className="relative">
                            <Search size={20} className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search for answers..."
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
                        </div>

                        {/* Search Results Dropdown */}
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

                        {/* No Results */}
                        {searchResults && searchResults.length === 0 && isSearchFocused && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl z-50">
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-[#21262d] rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search size={28} className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg mb-1">No results found</h4>
                                    <p className="text-base text-gray-500 dark:text-gray-400 mb-4">We couldn't find anything matching "{searchQuery}"</p>
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Need help? Reach out to us:</p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <a href="https://wa.me/254704473503" target="_blank" className="inline-flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white px-5 py-2.5 rounded-full font-medium transition-colors"><MessageCircle size={16} />WhatsApp Us</a>
                                            <a href="mailto:medraenursing@gmail.com" className="inline-flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-5 py-2.5 rounded-full font-medium transition-colors"><Mail size={16} />Email Us</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-full mx-auto px-0 md:px-2 lg:px-6 space-y-4 md:space-y-6 pt-4 md:pt-6">

                {/* Help Center Header */}
                <div className="px-2 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl px-2 py-5 shadow-sm">
                        {/* Back + label row */}
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

                        {/* Heading */}
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                            How can we help you today?
                        </h3>
                        <p className="text-base text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                            Search common questions or browse by topic below. Every answer is written by our team, kept short, and updated weekly.
                        </p>

                        {/* Quiet stats row */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
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
                </div>

                {/* Quick Help Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2 md:px-0">
                    <div className="bg-white dark:bg-gray-900 p-5 text-center rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-[#21262d] rounded-xl flex items-center justify-center mx-auto mb-3">
                            <Clock size={24} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <p className="text-base font-bold text-gray-700 dark:text-gray-300">Quick Start Guide</p>
                        <p className="text-sm text-gray-500">5 min to mastery</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 text-center rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-[#21262d] rounded-xl flex items-center justify-center mx-auto mb-3">
                            <BarChart size={24} className="text-gray-500 dark:text-gray-400" />
                        </div>
                        <p className="text-base font-bold text-gray-700 dark:text-gray-300">Track Progress</p>
                        <p className="text-sm text-gray-500">See improvement daily</p>
                    </div>
                </div>

                {/* KRCHN Curriculum Section */}
                <div className="px-2 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl px-2 py-5 shadow-sm">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-[#21262d] px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <BookOpen className="h-3.5 w-3.5" />
                            Complete KRCHN Curriculum
                        </div>

                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                            Study the Full NCK Syllabus — Organized
                        </h3>
                        <p className="text-base text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                            Medrae has built the most complete digital version of the Kenya Registered Community Health Nursing (KRCHN) curriculum. Every topic mapped, every question aligned.
                        </p>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { icon: GraduationCap, value: "3", label: "Academic Years" },
                                { icon: BookOpen, value: "80", label: "Modules" },
                                { icon: Target, value: "776+", label: "Topics" },
                                { icon: Brain, value: "15,400+", label: "NCK Questions" },
                            ].map((stat, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3 text-center">
                                    <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-gray-500 dark:text-gray-400" />
                                    <p className="text-base font-bold text-gray-800 dark:text-gray-200">{stat.value}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 grid gap-3">
                            {[
                                { year: "Year 1", desc: "Foundations — Communication, Anatomy, Fundamentals of Nursing, Microbiology, Psychology, Maternal & Newborn Health, Community Health, Pharmacology I, and clinical practicums." },
                                { year: "Year 2", desc: "Clinical Nursing — Pharmacology II, Medical-Surgical, Pediatric & IMCI, Mental Health, Orthopedic, Endocrine, ENT, Ophthalmic, Perioperative, Palliative Care, Gynaecology, Research." },
                                { year: "Year 3", desc: "Advanced Practice — Teaching Methodology, Neurology, Dermatology, Gerontology, Epidemiology, Communicable Diseases, Health Systems Management, and intensive clinical practicums." },
                            ].map((y, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-[#21262d] rounded-xl p-3">
                                    <p className="text-base font-bold text-gray-800 dark:text-gray-200">{y.year}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{y.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                Navigate Year → Semester → Module → Unit → Topic → Questions
                            </p>
                            <button
                                onClick={() => navigate("/nursing")}
                                className="inline-flex items-center gap-2 rounded-full bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                            >
                                <BookOpen className="h-4 w-4" />
                                Explore Curriculum
                            </button>
                        </div>
                    </div>
                </div>

                {/* FAQ Sections */}
                {faqCategories.map((category, idx) => {
                    return (
                        <div key={idx} className="space-y-3 px-2 md:px-0 w-full" data-category={idx}>
                            <div className="flex items-center gap-2">
                                {category.icon}
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{category.title}</h3>
                                <span className="ml-auto text-sm text-gray-400 bg-gray-100 dark:bg-[#21262d] px-3 py-1 rounded-full">{category.questions.length} qs</span>
                            </div>
                            <Accordion type="single" collapsible className="w-full space-y-2">
                                {category.questions.map((faq, fIdx) => (
                                    <AccordionItem
                                        key={fIdx}
                                        value={`item-${idx}-${fIdx}`}
                                        className="bg-white dark:bg-[#161b22] rounded-2xl px-2 shadow-sm transition-all hover:shadow-md border-0"
                                        data-category={idx}
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
                })}

                {/* Emergency Contact Banner */}
                <div className="px-2 md:px-0">
                    <div className="bg-white dark:bg-[#161b22] rounded-2xl px-2 py-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-bold text-base text-gray-800 dark:text-gray-200">Urgent technical help?</h4>
                                <p className="text-base text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">Having trouble with payments, login, or quiz loading? Contact us now.</p>
                                <div className="flex gap-3 mt-4 flex-wrap">
                                    <a href="https://wa.me/254704473503" target="_blank" className="text-sm bg-gray-800 hover:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white px-2 py-2 rounded-full font-medium transition-colors inline-flex items-center gap-2"><MessageCircle size={14} />WhatsApp</a>
                                    <a href="tel:0717517371" className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-2 rounded-full font-medium transition-colors inline-flex items-center gap-2"><Phone size={14} />0717 517 371</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                <section className="space-y-4 pt-4 px-2 md:px-0">
                    <div className="text-center space-y-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Still have questions?</h3>
                        <p className="text-base text-gray-500 dark:text-gray-400">Our team is here to help you succeed</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <a href="https://wa.me/254704473503" target="_blank" className="flex flex-col items-center text-center gap-3 p-5 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md">
                            <div className="bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                <MessageCircle size={22} />
                            </div>
                            <div>
                                <p className="font-bold text-base text-gray-800 dark:text-gray-200">WhatsApp</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Instant chat support</p>
                            </div>
                        </a>
                        <a href="tel:0717517371" className="flex flex-col items-center text-center gap-3 p-5 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md">
                            <div className="bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                <Phone size={22} />
                            </div>
                            <div>
                                <p className="font-bold text-base text-gray-800 dark:text-gray-200">Direct Call</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">0717 517 371</p>
                            </div>
                        </a>
                        <a href="tel:0704473503" className="flex flex-col items-center text-center gap-3 p-5 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md">
                            <div className="bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                <Phone size={22} />
                            </div>
                            <div>
                                <p className="font-bold text-base text-gray-800 dark:text-gray-200">Call (Alt)</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">0704 473 503</p>
                            </div>
                        </a>
                        <a href="mailto:medraenursing@gmail.com" className="flex flex-col items-center text-center gap-3 p-5 bg-white dark:bg-[#161b22] rounded-2xl transition-all shadow-sm group hover:shadow-md min-w-0">
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
                <div className="text-center space-y-4 pt-10 mx-4 md:mx-0">
                    <div className="flex items-center justify-center gap-2">
                        <Award size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <p className="text-xs uppercase tracking-[2px] font-bold text-gray-500 dark:text-gray-400">Medrae Nursing Platform</p>
                    </div>
                    <TermsButton />
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;