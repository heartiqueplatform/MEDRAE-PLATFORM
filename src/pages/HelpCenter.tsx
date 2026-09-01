import { ArrowLeft, MessageCircle, ShieldCheck, Mail, ExternalLink, Phone, BookOpen, GraduationCap, Globe, CreditCard, Sparkles, Zap, Users, BarChart, Clock, RefreshCw, AlertCircle, CheckCircle, Award, Star, Target, TrendingUp, Search, X, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { TermsButton } from "@/components/ui/TermsButton";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

// Lazy load image component for better performance
const LazyImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
            {!loaded && <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                className={`w-full h-full object-contain hover:scale-105 transition-transform duration-700 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
};
const HelpCenter = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const faqCategories = [
        {
            title: "Subscription & Payments",
            icon: <CreditCard className="w-4 h-4 md:w-5 text-green-500" />,
            questions: [
                {
                    question: "How is the subscription paid?",
                    answer: (
                        <div className="space-y-2">
                            <p>Medrae uses the M-Pesa payment system for all subscriptions. Here's how it works:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Go to <strong>Account Settings &gt; Subscription</strong></li>
                                <li>You'll receive a Paybill number and account number</li>
                                <li>Send the payment via M-Pesa</li>
                                <li>Our system <strong>automatically verifies</strong> the payment</li>
                                <li>Your account upgrades <strong>instantly</strong> - no manual intervention needed!</li>
                            </ol>
                        </div>
                    )
                },
                {
                    question: "Does my subscription automatically renew?",
                    answer: (
                        <div className="space-y-2">
                            <p>Yes! Your Medrae subscription is designed for seamless continuity:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
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
                        <div className="space-y-2">
                            <p>Your upgrade is <strong>instant!</strong> As soon as M-Pesa confirms payment:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Unlimited quiz attempts</li><li>Advanced performance analytics</li><li>Access to <strong>6,000+</strong> NCK-aligned questions</li><li>Priority support</li><li>Downloadable study materials</li>
                            </ul>
                            <p className="mt-2 text-emerald-600 dark:text-emerald-400 text-xs md:text-sm">✨ Changes reflect immediately on your dashboard!</p>
                        </div>
                    )
                },
                {
                    question: "What are the subscription plans and pricing?",
                    answer: (
                        <div className="space-y-2">
                            <p>We offer affordable plans designed for every nursing student:</p>
                            <ul className="list-disc list-inside space-y-2 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li><strong>Student Plan</strong> - <span className="text-emerald-600 dark:text-emerald-400 font-bold">KES 199</span><span className="block text-[10px] md:text-xs text-gray-500 dark:text-gray-500 ml-5">Perfect for students • Valid for 2 months</span></li>
                                <li><strong>Tutor Plan</strong> - <span className="text-emerald-600 dark:text-emerald-400 font-bold">KES 299</span><span className="block text-[10px] md:text-xs text-gray-500 dark:text-gray-500 ml-5">Advanced features for educators • Valid for 2 months</span></li>
                            </ul>
                            <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                <p className="text-[10px] md:text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"><Sparkles size={14} className="text-emerald-500" /><span>Both plans include instant access, unlimited quizzes, and progress tracking!</span></p>
                            </div>
                        </div>
                    )
                },
                {
                    question: "Is M-Pesa payment secure?",
                    answer: (
                        <div className="space-y-2">
                            <p>Absolutely! We prioritize your financial security:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Official Safaricom M-Pesa APIs with bank-grade encryption</li><li>We <strong>never</strong> store your M-Pesa details</li><li>All transactions are protected</li><li>You receive an official M-Pesa confirmation for every payment</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Trust & Question Accuracy",
            icon: <ShieldCheck className="w-4 h-4 md:w-5 text-emerald-500" />,
            questions: [
                {
                    question: "How does the Medrae NCK Algorithm work?",
                    answer: (
                        <div className="space-y-2">
                            <p>Our proprietary algorithm mirrors the NCK blueprint, balancing questions across:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Medical-Surgical Nursing</li><li>Reproductive Health</li><li>Community Health</li><li>Pediatrics</li><li>Mental Health</li>
                            </ul>
                            <p className="mt-1 text-xs md:text-sm">The algorithm <strong>adapts to your performance</strong>, focusing on areas needing improvement.</p>
                        </div>
                    )
                },
                {
                    question: "Where do the questions come from?",
                    answer: (
                        <div className="space-y-2">
                            <p>We source from three pillars of excellence:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Verified NCK Past Papers from the last <strong>10 years</strong></li><li>Current clinical guidelines from major teaching hospitals</li><li>High-yield units from international licensing exams (NCLEX-style)</li>
                            </ol>
                            <p className="mt-1 text-xs md:text-sm">Every question is <strong>meticulously researched</strong> and updated weekly.</p>
                        </div>
                    )
                },
                {
                    question: "Who verifies the medical content?",
                    answer: (
                        <div className="space-y-2">
                            <p>Your learning is in expert hands:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Board of <strong>Registered Nurse Educators</strong></li><li>Experienced Clinicians</li><li>Top nursing tutors from Kenya's premier institutions</li>
                            </ul>
                            <p className="mt-1 text-xs md:text-sm">Every answer aligns with <strong>evidence-based practice</strong> and NCK marking schemes.</p>
                        </div>
                    )
                },
                {
                    question: "How often is the question bank updated?",
                    answer: (
                        <div className="space-y-2">
                            <p>We refresh our content <strong>weekly</strong> based on:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Recent NCK exam patterns</li><li>New Ministry of Health guidelines</li><li>Community feedback</li><li>Emerging healthcare trends</li>
                            </ul>
                            <p className="mt-1 text-xs md:text-sm">You always study the <strong>most current</strong> material.</p>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Study & Performance",
            icon: <BookOpen className="w-4 h-4 md:w-5 text-blue-500" />,
            questions: [
                {
                    question: "Which nursing units are most tested in NCK exams?",
                    answer: (
                        <div className="space-y-2">
                            <p>Based on 8+ years of NCK exam analysis:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
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
                        <div className="space-y-2">
                            <p>Absolutely! Medrae offers focused practice:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Filter quizzes by specific subjects</li><li><strong>"My Mistakes"</strong> feature identifies weak areas</li><li>AI creates <strong>personalized practice sessions</strong></li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "How many questions should I practice daily?",
                    answer: (
                        <div className="space-y-2">
                            <p>For optimal preparation, we recommend:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li><strong>50-100</strong> questions daily</li><li>Quick 10-question sessions</li><li>Full <strong>150-question</strong> mock exams</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Account & Security",
            icon: <Globe className="w-4 h-4 md:w-5 text-purple-500" />,
            questions: [
                {
                    question: "Can I use Medrae on my phone and laptop?",
                    answer: (
                        <div className="space-y-2">
                            <p>Yes! Medrae is fully responsive:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Works on smartphones, tablets, and laptops</li><li><strong>One active session</strong> for security</li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "How do I reset my password?",
                    answer: (
                        <div className="space-y-2">
                            <p>Resetting your password is simple:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Click <strong>"Forgot Password"</strong> on login</li><li>Enter your registered email</li><li>Receive a secure reset link</li>
                            </ol>
                        </div>
                    )
                },
                {
                    question: "The quiz isn't loading correctly. What should I do?",
                    answer: (
                        <div className="space-y-2">
                            <p>Most loading issues can be resolved quickly:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Click <strong>"Refresh"</strong> on your dashboard</li><li>Clear browser cache</li><li>Try Chrome or Firefox</li>
                            </ul>
                        </div>
                    )
                }
            ]
        },
        {
            title: "Tips & Success Strategies",
            icon: <Award className="w-4 h-4 md:w-5 text-rose-500" />,
            questions: [
                {
                    question: "What are the best study strategies for NCK?",
                    answer: (
                        <div className="space-y-2">
                            <p>From our successful students:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li>Practice <strong>50-70 questions daily</strong></li><li>Review rationales even for correct answers</li><li>Focus on weak areas using <strong>"My Mistakes"</strong></li><li>Take weekly full-length mocks</li>
                            </ul>
                        </div>
                    )
                },
                {
                    question: "How can I reduce exam anxiety?",
                    answer: (
                        <div className="space-y-2">
                            <p>We've built tools to help you stay calm:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400 text-xs md:text-sm">
                                <li><strong>"Exam Simulator"</strong> mode builds confidence</li><li>Timed practice sessions daily</li><li><strong>7-day pre-exam checklist</strong></li>
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

    const imageSections = [
        { image: "high3.png", position: 1 },
        { image: "high6.png", position: 3 },
        { image: "background05.jpg", position: 5 },
        { image: "background06.jpg", position: 7 }
    ];

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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20 dark:bg-transparent dark:from-transparent dark:via-transparent dark:to-transparent pb-20 md:pb-24">

            {/* Sticky Search Bar */}
            <div className="sticky -top-4 z-[100] bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 p-3 md:p-4">
                <div className="max-w-full mx-auto px-0 md:px-4 lg:px-6">
                    <div className="relative">
                        <div className="relative">
                            <Search size={16} className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search for answers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                className="w-full pl-9 md:pl-10 pr-9 py-2 md:py-2.5 bg-white dark:bg-gray-800 border-0 rounded-lg md:rounded-xl text-xs md:text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 shadow-sm transition-all"
                                autoComplete="off"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 md:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults && searchResults.length > 0 && isSearchFocused && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 md:mt-2 bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[350px] md:max-h-[400px] overflow-y-auto z-50">
                                <div className="p-1.5 md:p-2">
                                    <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 md:px-3 py-1.5 md:py-2 font-semibold">Found {searchResults.length} results</p>
                                    {searchResults.map((result, idx) => (
                                        <button key={idx} onClick={() => scrollToQuestion(result.categoryIndex, result.questionIndex)} className="w-full text-left px-2 md:px-3 py-2 md:py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg md:rounded-xl transition-colors group">
                                            <div className="flex items-start gap-1.5 md:gap-2">
                                                <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0">{result.categoryIcon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs md:text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">{result.question}</p>
                                                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5">in <span className="font-medium">{result.category}</span></p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No Results */}
                        {searchResults && searchResults.length === 0 && isSearchFocused && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 md:mt-2 bg-white dark:bg-gray-900 rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 z-50">
                                <div className="p-4 md:p-6 text-center">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                                        <Search size={22} className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base mb-0.5 md:mb-1">No results found</h4>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-3 md:mb-4">We couldn't find anything matching "{searchQuery}"</p>
                                    <div className="space-y-1.5 md:space-y-2">
                                        <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Need help? Reach out to us:</p>
                                        <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center">
                                            <a href="https://wa.me/254704473503" target="_blank" className="inline-flex items-center gap-1.5 text-[10px] md:text-xs bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full font-medium transition-colors"><MessageCircle size={12} />WhatsApp Us</a>
                                            <a href="mailto:medraenursing@gmail.com" className="inline-flex items-center gap-1.5 text-[10px] md:text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full font-medium transition-colors"><Mail size={12} />Email Us</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-full mx-auto px-0 md:px-4 lg:px-6 space-y-0 md:space-y-2 pt-4 md:pt-6">

                {/* Combined Trust Banner with Back Button & Branding */}
                <div className="relative md:rounded-3xl p-5 md:p-6 text-white md:shadow-xl overflow-hidden min-h-[180px] md:min-h-[200px] rounded-none">
                    <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(/indexbackground3.jpg)` }}>
                        <div className="absolute inset-0 backdrop-blur-md bg-gradient-to-br from-black/60 via-black/40 to-black/20"></div>
                    </div>
                    <div className="relative z-10">
                        {/* Back Button & Logo Row */}
                        <div className="flex items-center gap-0 md:gap-3 mb-3 md:mb-4">
                            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-white/10 rounded-lg md:rounded-xl flex-shrink-0 h-8 w-8 md:h-9 md:w-9 text-white">
                                <ArrowLeft size={18} />
                            </Button>
                            <img src="/pwa-192x192.png" alt="Medrae" className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl shadow-lg border-2 border-white/30" loading="lazy" />
                            <div>
                                <h2 className="text-base md:text-lg font-bold">
                                    <span className="text-red-400">Medrae </span>Nursing Support
                                </h2>
                                <p className="text-[10px] md:text-xs text-white/70">Your success is our priority</p>
                            </div>
                            <span className="ml-auto text-[9px] md:text-[10px] bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full font-medium">24/7</span>
                        </div>

                        {/* Trust Badge */}
                        <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                            <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[2px] opacity-90">Trusted by 2,321+ Kenyan Nurses</span>
                        </div>

                        <p className="text-xs md:text-sm text-white/95 leading-relaxed max-w-lg font-medium">
                            Our database is updated weekly with questions and rationales aligned to NCK, FQE, and all nursing board exams.
                            <span className="block mt-0.5 md:mt-1 font-bold text-white">✨ 98.7% pass rate among our premium subscribers.</span>
                        </p>

                        <div className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4 text-[10px] md:text-xs">
                            <div className="flex items-center gap-1 md:gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 md:px-3 py-1 md:py-1.5 rounded-full border border-white/10"><CheckCircle size={12} className="text-emerald-300" /><span className="font-medium">NCK Verified</span></div>
                            <div className="flex items-center gap-1 md:gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 md:px-3 py-1 md:py-1.5 rounded-full border border-white/10"><Zap size={12} className="text-yellow-300" /><span className="font-medium">Instant Access</span></div>
                            <div className="flex items-center gap-1 md:gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 md:px-3 py-1 md:py-1.5 rounded-full border border-white/10"><ShieldCheck size={12} className="text-emerald-300" /><span className="font-medium">Secure Payment</span></div>
                        </div>
                    </div>
                    <div className="absolute -right-16 -bottom-16 opacity-5"><ShieldCheck size={200} /></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-3xl"></div>
                </div>

                {/* Quick Help Cards - full width on mobile */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 px-3 md:px-0">
                    <div className="bg-white dark:bg-gray-900 md:border md:border-emerald-100 md:dark:border-gray-800 md:rounded-2xl p-3 md:p-4 text-center md:shadow-sm md:hover:shadow-md transition-shadow border-b border-gray-100 dark:border-gray-800">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-1.5 md:mb-2">
                            <Clock size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">Quick Start Guide</p>
                        <p className="text-[9px] md:text-[10px] text-gray-500">5 min to mastery</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 md:border md:border-emerald-100 md:dark:border-gray-800 md:rounded-2xl p-3 md:p-4 text-center md:shadow-sm md:hover:shadow-md transition-shadow border-b border-gray-100 dark:border-gray-800">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-1.5 md:mb-2">
                            <BarChart size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">Track Progress</p>
                        <p className="text-[9px] md:text-[10px] text-gray-500">See improvement daily</p>
                    </div>
                </div>
                {/* ============================================ */}
                {/* KRCHN CURRICULUM SECTION */}
                {/* ============================================ */}
                <div className="px-0 md:px-0">
                    <div className="relative overflow-hidden md:rounded-2xl md:border-0 bg-white/70 p-4 md:p-5 md:shadow-xl backdrop-blur-xl dark:bg-muted/30 sm:p-6 border-b border-slate-100 dark:border-slate-800 md:border-b-0">
                        <div className="absolute right-0 top-0 h-24 md:h-32 w-24 md:w-32 rounded-bl-full bg-emerald-100/80 dark:bg-emerald-400/10" />
                        <div className="absolute bottom-0 left-0 h-20 md:h-24 w-20 md:w-24 rounded-tr-full bg-cyan-100/80 dark:bg-cyan-400/10" />

                        <div className="relative">
                            {/* Badge */}
                            <div className="mb-2 md:mb-3 inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-emerald-100 px-2.5 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                                <BookOpen className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                Complete KRCHN Curriculum
                            </div>

                            {/* Title */}
                            <h3 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                                Study the Full NCK Syllabus — Organized
                            </h3>
                            <p className="mt-1.5 md:mt-2 text-[11px] md:text-sm leading-6 text-slate-600 dark:text-slate-300">
                                Medrae has built the most complete digital version of the Kenya Registered Community Health Nursing (KRCHN) curriculum. Every topic mapped, every question aligned.
                            </p>

                            {/* Stats Grid */}
                            <div className="mt-3 md:mt-4 grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
                                {[
                                    { icon: GraduationCap, value: "3", label: "Academic Years", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-400/10" },
                                    { icon: BookOpen, value: "80", label: "Modules", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-400/10" },
                                    { icon: Target, value: "776+", label: "Topics", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-400/10" },
                                    { icon: Brain, value: "15,400+", label: "NCK Questions", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-400/10" },
                                ].map((stat, i) => (
                                    <div key={i} className={`${stat.bg} md:rounded-xl p-2 md:p-3 text-center md:border md:border-slate-100 md:dark:border-slate-800 border-b border-slate-100 dark:border-slate-800 md:border-b md:border-slate-100`}>
                                        <stat.icon className={`w-4 h-4 md:w-5 md:h-5 mx-auto mb-0.5 md:mb-1 ${stat.color}`} />
                                        <p className={`text-base md:text-lg font-black ${stat.color}`}>{stat.value}</p>
                                        <p className="text-[9px] md:text-[10px] font-semibold text-slate-600 dark:text-slate-400">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Year Breakdown */}
                            <div className="mt-3 md:mt-4 grid gap-1.5 md:gap-2">
                                {[
                                    { year: "Year 1", desc: "Foundations — Communication, Anatomy, Fundamentals of Nursing, Microbiology, Psychology, Maternal & Newborn Health, Community Health, Pharmacology I, and clinical practicums.", color: "border-l-emerald-500" },
                                    { year: "Year 2", desc: "Clinical Nursing — Pharmacology II, Medical-Surgical, Pediatric & IMCI, Mental Health, Orthopedic, Endocrine, ENT, Ophthalmic, Perioperative, Palliative Care, Gynaecology, Research.", color: "border-l-blue-500" },
                                    { year: "Year 3", desc: "Advanced Practice — Teaching Methodology, Neurology, Dermatology, Gerontology, Epidemiology, Communicable Diseases, Health Systems Management, and intensive clinical practicums.", color: "border-l-purple-500" },
                                ].map((y, i) => (
                                    <div key={i} className={`bg-white dark:bg-slate-900/70 md:rounded-xl p-2.5 md:p-3 border-l-4 ${y.color} md:border md:border-slate-100 md:dark:border-slate-800 border-b border-slate-100 dark:border-slate-800 md:border-b md:border-slate-100`}>
                                        <p className="text-[11px] md:text-xs font-bold text-slate-900 dark:text-white">{y.year}</p>
                                        <p className="text-[9px] md:text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{y.desc}</p>
                                    </div>
                                ))}
                            </div>

                            {/* CTA */}
                            <div className="mt-3 md:mt-4 text-center">
                                <p className="text-[9px] md:text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mb-1.5 md:mb-2">
                                    Navigate Year → Semester → Module → Unit → Topic → Questions
                                </p>
                                <button
                                    onClick={() => navigate("/nursing")}
                                    className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-emerald-600 px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all dark:shadow-emerald-900/30 active:scale-[0.98]"
                                >
                                    <BookOpen className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                    Explore Curriculum
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* FAQ Sections */}
                {faqCategories.map((category, idx) => {
                    const imageSection = imageSections.find(img => img.position === idx + 1);
                    return (
                        <div key={idx} className="space-y-2 md:space-y-3 px-3 md:px-0 w-full" data-category={idx}>
                            <div className="flex items-center gap-1.5 md:gap-2">
                                {category.icon}
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-xs md:text-sm">{category.title}</h3>
                                <span className="ml-auto text-[9px] md:text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 md:px-2 py-0.5 rounded-full">{category.questions.length} qs</span>
                            </div>
                            <Accordion type="single" collapsible className="w-full space-y-1.5 md:space-y-2">
                                {category.questions.map((faq, fIdx) => (
                                    <AccordionItem
                                        key={fIdx}
                                        value={`item-${idx}-${fIdx}`}
                                        className="bg-white dark:bg-gray-900 md:border-0 md:rounded-2xl px-3 md:px-4 transition-all md:hover:border-emerald-300 md:dark:hover:border-emerald-800 md:shadow-sm md:hover:shadow-md border-b border-gray-100 dark:border-gray-800"
                                        data-category={idx}
                                        data-question={fIdx}
                                    >
                                        <AccordionTrigger className="hover:no-underline text-left text-xs md:text-sm font-semibold py-3 md:py-4 text-gray-800 dark:text-gray-200">
                                            <span className="flex items-center gap-1.5 md:gap-2">
                                                <span className="text-emerald-500 dark:text-emerald-400 text-[10px] md:text-xs font-mono">#{fIdx + 1}</span>
                                                {faq.question}
                                            </span>
                                        </AccordionTrigger>
                                        <AccordionContent className="text-gray-600 dark:text-gray-400 leading-relaxed pb-3 md:pb-4 border-t border-gray-100 dark:border-gray-800 pt-2 md:pt-3 mt-0.5 md:mt-1 text-xs md:text-sm">
                                            {faq.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                            {imageSection && (
                                <div className="my-6 md:my-8 md:rounded-2xl overflow-hidden md:shadow-xl md:border-0 bg-white dark:bg-gray-900">
                                    <div className="relative aspect-[4/3] md:aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <LazyImage src={`/${imageSection.image}`} alt="Medrae Nursing Platform" className="absolute inset-0 w-full h-full" />
                                        <div className="absolute bottom-0 left-0 right-0 h-16 md:h-20 bg-gradient-to-t from-black/40 to-transparent"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {/* Emergency Contact Banner */}
                <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-950/10 md:border-0 md:rounded-2xl p-4 md:p-4 md:shadow-sm mx-3 md:mx-0 rounded-xl">
                    <div className="flex items-start gap-2 md:gap-3">
                        <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-bold text-xs md:text-sm text-red-800 dark:text-red-300">⚠️ Urgent Technical Help?</h4>
                            <p className="text-[10px] md:text-xs text-red-700 dark:text-red-400 mt-0.5">Having trouble with payments, login, or quiz loading? Contact us now.</p>
                            <div className="flex gap-2 md:gap-3 mt-2 md:mt-3 flex-wrap">
                                <a href="https://wa.me/254704473503" target="_blank" className="text-[10px] md:text-xs bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-1.5 rounded-full font-medium transition-colors inline-flex items-center gap-1"><MessageCircle size={12} />WhatsApp</a>
                                <a href="tel:0717517371" className="text-[10px] md:text-xs bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 px-3 md:px-4 py-1.5 rounded-full font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors inline-flex items-center gap-1"><Phone size={12} />0717 517 371</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                <section className="space-y-3 md:space-y-4 pt-3 md:pt-4 px-3 md:px-0">
                    <div className="text-center space-y-0.5 md:space-y-1">
                        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">Still have questions?</h3>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Our team is here to help you succeed</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                        <a href="https://wa.me/254704473503" target="_blank" className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 md:border-0 md:rounded-2xl md:hover:border-green-500 md:dark:hover:border-green-700 transition-all md:shadow-sm group border-b border-gray-100 dark:border-gray-800">
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 md:p-3 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform"><MessageCircle size={20} /></div>
                            <div><p className="font-bold text-xs md:text-sm text-gray-800 dark:text-gray-200">WhatsApp</p><p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">Instant chat support</p></div>
                        </a>
                        <a href="tel:0717517371" className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 md:border-0 md:rounded-2xl md:hover:border-blue-500 md:dark:hover:border-blue-700 transition-all md:shadow-sm group">
                            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 md:p-3 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform"><Phone size={20} /></div>
                            <div><p className="font-bold text-xs md:text-sm text-gray-800 dark:text-gray-200">Direct Call</p><p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">0717 517 371</p></div>
                        </a>
                        <a href="tel:0704473503" className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 md:border-0 md:rounded-2xl md:hover:border-purple-500 md:dark:hover:border-purple-700 transition-all md:shadow-sm group">
                            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 md:p-3 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform"><Phone size={20} /></div>
                            <div><p className="font-bold text-xs md:text-sm text-gray-800 dark:text-gray-200">Call (Alt)</p><p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">0704 473 503</p></div>
                        </a>
                        <a href="mailto:medraenursing@gmail.com" className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white dark:bg-gray-900 md:border-0 md:rounded-2xl md:hover:border-orange-500 md:dark:hover:border-orange-700 transition-all md:shadow-sm group sm:col-span-2">
                            <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-2 md:p-3 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform"><Mail size={20} /></div>
                            <div className="flex-1"><p className="font-bold text-xs md:text-sm text-gray-800 dark:text-gray-200">Email Support</p><p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">medraenursing@gmail.com</p></div>
                            <ExternalLink size={12} className="text-gray-300 dark:text-gray-600" />
                        </a>
                    </div>
                </section>
                {/* Footer */}
                <div className="text-center space-y-3 md:space-y-4 pt-8 md:pt-10 border-t border-gray-200 dark:border-gray-800 mx-3 md:mx-0">
                    <div className="flex items-center justify-center gap-1.5 md:gap-2">
                        <Award size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[9px] md:text-[10px] uppercase tracking-[2px] font-bold text-gray-500 dark:text-gray-400">Medrae Nursing Platform</p>
                    </div>
                    <TermsButton />
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;