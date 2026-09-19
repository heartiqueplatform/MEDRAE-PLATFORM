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
                            <div className="bg-red-50 dark:bg-red-950/30 p-5 rounded-2xl border-0">
                                <p className="font-bold text-red-700 dark:text-red-300 text-base mb-2 flex items-center gap-2"><AlertCircle size={20} /> The Simple Fix</p>
                                <p className="text-base text-red-800 dark:text-red-200">You just need to <strong>log out</strong> and then <strong>log back in</strong>. This refreshes your session and everything will work smoothly again.</p>
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
                            <div className="bg-blue-50 dark:bg-blue-950/30 p-5 rounded-2xl border-0">
                                <p className="font-bold text-blue-700 dark:text-blue-300 text-base mb-3 flex items-center gap-2"><Phone size={20} /> On Your Phone</p>
                                <ol className="list-decimal list-inside space-y-3 text-base text-blue-800 dark:text-blue-200">
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
                            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border-0">
                                <p className="text-base text-emerald-700 dark:text-emerald-300 flex items-center gap-2"><Sparkles size={18} className="text-emerald-500" /><span>Both plans include instant access, unlimited quizzes, and progress tracking!</span></p>
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20 dark:bg-transparent dark:from-transparent dark:via-transparent dark:to-transparent pb-20 md:pb-24 font-sans" style={{ fontFamily: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>

            {/* Sticky Search Bar */}
            <div className="sticky -top-4 z-[100] bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-4 md:p-5">
                <div className="max-w-full mx-auto px-0 md:px-4 lg:px-6">
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
                                className="w-full pl-11 md:pl-12 pr-11 py-3 md:py-4 bg-white dark:bg-gray-800 border-0 rounded-2xl text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 shadow-sm transition-all"
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
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[400px] overflow-y-auto z-50">
                                <div className="p-2">
                                    <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 py-2 font-semibold">Found {searchResults.length} results</p>
                                    {searchResults.map((result, idx) => (
                                        <button key={idx} onClick={() => scrollToQuestion(result.categoryIndex, result.questionIndex)} className="w-full text-left px-3 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-colors group">
                                            <div className="flex items-start gap-2">
                                                <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0">{result.categoryIcon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-medium text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">{result.question}</p>
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
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50">
                                <div className="p-6 text-center">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search size={28} className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg mb-1">No results found</h4>
                                    <p className="text-base text-gray-500 dark:text-gray-400 mb-4">We couldn't find anything matching "{searchQuery}"</p>
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Need help? Reach out to us:</p>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            <a href="https://wa.me/254704473503" target="_blank" className="inline-flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-full font-medium transition-colors"><MessageCircle size={16} />WhatsApp Us</a>
                                            <a href="mailto:medraenursing@gmail.com" className="inline-flex items-center gap-2 text-sm bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-full font-medium transition-colors"><Mail size={16} />Email Us</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-full mx-auto px-0 md:px-4 lg:px-6 space-y-4 md:space-y-6 pt-4 md:pt-6">

                {/* Combined Trust Banner with Back Button & Branding */}
                <div className="relative md:rounded-3xl p-6 md:p-8 text-white md:shadow-xl overflow-hidden min-h-[220px] md:min-h-[240px] rounded-none mx-0">
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(/indexbackground3.jpg)` }}>
                        <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-br from-black/60 via-black/40 to-black/20"></div>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-white/10 rounded-xl flex-shrink-0 h-10 w-10 text-white">
                                <ArrowLeft size={22} />
                            </Button>
                            <img src="/pwa-192x192.png" alt="Medrae" className="w-12 h-12 rounded-xl shadow-lg border-2 border-white/30" loading="lazy" />
                            <div>
                                <h2 className="text-lg md:text-xl font-bold">
                                    <span className="text-red-400">Medrae </span>Nursing Support
                                </h2>
                                <p className="text-sm text-white/70">Your success is our priority</p>
                            </div>
                            <span className="ml-auto text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-medium">24/7</span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <GraduationCap className="w-5 h-5 md:w-6 md:h-6" />
                            <span className="text-xs font-bold uppercase tracking-[2px] opacity-90">Trusted by 2,321+ Kenyan Nurses</span>
                        </div>

                        <p className="text-base md:text-lg text-white/95 leading-relaxed max-w-lg font-medium">
                            Our database is updated weekly with questions and rationales aligned to NCK, FQE, and all nursing board exams.
                            <span className="block mt-2 font-bold text-white">✨ 98.7% pass rate among our premium subscribers.</span>
                        </p>

                        <div className="flex flex-wrap gap-3 mt-4 text-sm">
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"><CheckCircle size={16} className="text-emerald-300" /><span className="font-medium">NCK Verified</span></div>
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"><Zap size={16} className="text-yellow-300" /><span className="font-medium">Instant Access</span></div>
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"><ShieldCheck size={16} className="text-emerald-300" /><span className="font-medium">Secure Payment</span></div>
                        </div>
                    </div>
                    <div className="absolute -right-16 -bottom-16 opacity-5"><ShieldCheck size={200} /></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-3xl"></div>
                </div>

                {/* Quick Help Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-0">
                    <div className="bg-white dark:bg-gray-900 p-5 text-center rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <Clock size={24} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-base font-bold text-gray-700 dark:text-gray-300">Quick Start Guide</p>
                        <p className="text-sm text-gray-500">5 min to mastery</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-5 text-center rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <BarChart size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-base font-bold text-gray-700 dark:text-gray-300">Track Progress</p>
                        <p className="text-sm text-gray-500">See improvement daily</p>
                    </div>
                </div>

                {/* ============================================ */}
                {/* KRCHN CURRICULUM SECTION */}
                {/* ============================================ */}
                <div className="px-4 md:px-0">
                    <div className="relative overflow-hidden md:rounded-2xl bg-white/70 p-5 md:p-6 md:shadow-xl backdrop-blur-xl dark:bg-muted/30 sm:p-6 mx-0">
                        <div className="absolute right-0 top-0 h-28 md:h-32 w-28 md:w-32 rounded-bl-full bg-emerald-100/80 dark:bg-emerald-400/10" />
                        <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-cyan-100/80 dark:bg-cyan-400/10" />

                        <div className="relative">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                <BookOpen className="h-4 w-4" />
                                Complete KRCHN Curriculum
                            </div>

                            <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                Study the Full NCK Syllabus — Organized
                            </h3>
                            <p className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-300">
                                Medrae has built the most complete digital version of the Kenya Registered Community Health Nursing (KRCHN) curriculum. Every topic mapped, every question aligned.
                            </p>

                            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { icon: GraduationCap, value: "3", label: "Academic Years", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-400/10" },
                                    { icon: BookOpen, value: "80", label: "Modules", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-400/10" },
                                    { icon: Target, value: "776+", label: "Topics", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-400/10" },
                                    { icon: Brain, value: "15,400+", label: "NCK Questions", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-400/10" },
                                ].map((stat, i) => (
                                    <div key={i} className={`${stat.bg} rounded-xl p-4 text-center shadow-sm`}>
                                        <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                                        <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 grid gap-3">
                                {[
                                    { year: "Year 1", desc: "Foundations — Communication, Anatomy, Fundamentals of Nursing, Microbiology, Psychology, Maternal & Newborn Health, Community Health, Pharmacology I, and clinical practicums.", color: "border-l-emerald-500" },
                                    { year: "Year 2", desc: "Clinical Nursing — Pharmacology II, Medical-Surgical, Pediatric & IMCI, Mental Health, Orthopedic, Endocrine, ENT, Ophthalmic, Perioperative, Palliative Care, Gynaecology, Research.", color: "border-l-blue-500" },
                                    { year: "Year 3", desc: "Advanced Practice — Teaching Methodology, Neurology, Dermatology, Gerontology, Epidemiology, Communicable Diseases, Health Systems Management, and intensive clinical practicums.", color: "border-l-purple-500" },
                                ].map((y, i) => (
                                    <div key={i} className={`bg-white dark:bg-slate-900/70 rounded-xl p-4 border-l-4 ${y.color} shadow-sm`}>
                                        <p className="text-base font-bold text-slate-900 dark:text-white">{y.year}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{y.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                    Navigate Year → Semester → Module → Unit → Topic → Questions
                                </p>
                                <button
                                    onClick={() => navigate("/nursing")}
                                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all dark:shadow-emerald-900/30 active:scale-[0.98]"
                                >
                                    <BookOpen className="h-5 w-5" />
                                    Explore Curriculum
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Sections */}
                {faqCategories.map((category, idx) => {
                    return (
                        <div key={idx} className="space-y-3 px-4 md:px-0 w-full" data-category={idx}>
                            <div className="flex items-center gap-2">
                                {category.icon}
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{category.title}</h3>
                                <span className="ml-auto text-sm text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{category.questions.length} qs</span>
                            </div>
                            <Accordion type="single" collapsible className="w-full space-y-2">
                                {category.questions.map((faq, fIdx) => (
                                    <AccordionItem
                                        key={fIdx}
                                        value={`item-${idx}-${fIdx}`}
                                        className="bg-white dark:bg-gray-900 rounded-2xl px-4 shadow-sm transition-all hover:shadow-md border-0"
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
                <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-950/10 rounded-2xl p-5 shadow-sm mx-4 md:mx-0">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-bold text-base text-red-800 dark:text-red-300">⚠️ Urgent Technical Help?</h4>
                            <p className="text-base text-red-700 dark:text-red-400 mt-1">Having trouble with payments, login, or quiz loading? Contact us now.</p>
                            <div className="flex gap-3 mt-4 flex-wrap">
                                <a href="https://wa.me/254704473503" target="_blank" className="text-base bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full font-medium transition-colors inline-flex items-center gap-2"><MessageCircle size={16} />WhatsApp</a>
                                <a href="tel:0717517371" className="text-base bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 px-5 py-2.5 rounded-full font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors inline-flex items-center gap-2 shadow-sm"><Phone size={16} />0717 517 371</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                <section className="space-y-4 pt-4 px-4 md:px-0">
                    <div className="text-center space-y-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Still have questions?</h3>
                        <p className="text-base text-gray-500 dark:text-gray-400">Our team is here to help you succeed</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <a href="https://wa.me/254704473503" target="_blank" className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl transition-all shadow-sm group hover:shadow-md">
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-xl group-hover:scale-110 transition-transform"><MessageCircle size={24} /></div>
                            <div><p className="font-bold text-base text-gray-800 dark:text-gray-200">WhatsApp</p><p className="text-sm text-gray-500 dark:text-gray-400">Instant chat support</p></div>
                        </a>
                        <a href="tel:0717517371" className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl transition-all shadow-sm group hover:shadow-md">
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-3 rounded-xl group-hover:scale-110 transition-transform"><Phone size={24} /></div>
                            <div><p className="font-bold text-base text-gray-800 dark:text-gray-200">Direct Call</p><p className="text-sm text-gray-500 dark:text-gray-400">0717 517 371</p></div>
                        </a>
                        <a href="tel:0704473503" className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl transition-all shadow-sm group hover:shadow-md">
                            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-3 rounded-xl group-hover:scale-110 transition-transform"><Phone size={24} /></div>
                            <div><p className="font-bold text-base text-gray-800 dark:text-gray-200">Call (Alt)</p><p className="text-sm text-gray-500 dark:text-gray-400">0704 473 503</p></div>
                        </a>
                        <a href="mailto:medraenursing@gmail.com" className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl transition-all shadow-sm group hover:shadow-md sm:col-span-2 lg:col-span-1">
                            <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-3 rounded-xl group-hover:scale-110 transition-transform"><Mail size={24} /></div>
                            <div className="flex-1"><p className="font-bold text-base text-gray-800 dark:text-gray-200">Email Support</p><p className="text-sm text-gray-500 dark:text-gray-400">medraenursing@gmail.com</p></div>
                            <ExternalLink size={16} className="text-gray-300 dark:text-gray-600" />
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