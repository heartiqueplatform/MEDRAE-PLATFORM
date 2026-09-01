"use client";

import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Cookie,
    ShieldCheck,
    Eye,
    Database,
    LockKeyhole,
    UserCheck,
    Mail,
    Phone,
    ExternalLink,
    HelpCircle,
    Smartphone,
    MessageSquare,
    ShieldAlert,
    ArrowRight,
    ScrollText,
    Clock,
    Globe,
    Settings,
    AlertTriangle,
    CheckCircle,
    Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function CookiePolicyPage() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const sections = [
        { id: "what-are-cookies", title: "1. What Are Cookies", icon: <Info className="h-5 w-5" /> },
        { id: "how-we-use", title: "2. How We Use Cookies", icon: <Database className="h-5 w-5" /> },
        { id: "types", title: "3. Types of Cookies", icon: <Cookie className="h-5 w-5" /> },
        { id: "third-party", title: "4. Third-Party Cookies", icon: <Globe className="h-5 w-5" /> },
        { id: "control", title: "5. Managing Cookies", icon: <Settings className="h-5 w-5" /> },
        { id: "security", title: "6. Security & Privacy", icon: <LockKeyhole className="h-5 w-5" /> },
        { id: "updates", title: "7. Policy Updates", icon: <ScrollText className="h-5 w-5" /> },
        { id: "contact", title: "8. Contact Us", icon: <Mail className="h-5 w-5" /> },
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="min-h-screen w-full py-0 md:py-2 bg-white text-gray-900 px-0 md:px-2 font-sans antialiased">
            {/* Sticky Navigation Header */}
            <header className="sticky top-0 z-50 w-full border-0 bg-white/95 backdrop-blur-md border-b border-gray-100">
                <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
                    <Button
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-1.5 md:gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 text-xs md:text-sm h-8 md:h-9 px-2.5 md:px-3 rounded-lg md:rounded-xl"
                    >
                        <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Back
                    </Button>
                    <div className="flex items-center gap-1.5 md:gap-2 text-black font-bold text-sm md:text-base">
                        <Cookie className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Cookie Policy</span>
                    </div>
                    <div className="w-16 md:w-20" />
                </div>
            </header>

            <main className="container mx-auto px-0 md:px-4 py-2 md:py-2 lg:py-2">
                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-28">

                    {/* Mobile Section Quick Nav - Horizontal Scroll */}
                    <div className="lg:hidden px-3 pt-2 pb-1">
                        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-slate-400">{section.icon}</span>
                                    {section.title.split('. ')[1] || section.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Sidebar Navigation */}
                    <aside className="hidden lg:block w-64 shrink-0 h-fit sticky top-24">
                        <div className="relative overflow-hidden rounded-xl bg-white/60 border border-slate-100 p-5 shadow-sm">
                            <div className="absolute -bottom-8 -right-8 w-40 h-40 opacity-40 pointer-events-none select-none">
                                <img
                                    src="/terms%20(1).png"
                                    alt=""
                                    className="w-full h-full object-contain transform -rotate-12"
                                    loading="lazy"
                                    style={{
                                        maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
                                        WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)'
                                    }}
                                />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5 px-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    Sections
                                </p>
                                <nav className="space-y-1.5">
                                    {sections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => scrollToSection(section.id)}
                                            className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-amber-700 hover:bg-white rounded-xl transition-all duration-200 group border border-transparent hover:border-amber-50 hover:shadow-sm"
                                        >
                                            <span className="text-slate-400 group-hover:text-amber-500 group-hover:scale-110 transition-all duration-200">
                                                {section.icon}
                                            </span>
                                            {section.title}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        <div className="mt-1 p-4 rounded-xl bg-amber-600 text-white shadow-lg shadow-amber-200/50 relative overflow-hidden group cursor-pointer">
                            <div className="relative z-10">
                                <p className="text-xs font-bold opacity-80 mb-1">Cookie help?</p>
                                <p className="text-[11px] leading-tight">Learn how to manage your preferences.</p>
                            </div>
                            <div className="absolute -right-2 -bottom-2 opacity-20 transform group-hover:scale-110 transition-transform">
                                <Cookie className="h-12 w-12" />
                            </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="px-0 mt-2">
                            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md w-full overflow-hidden">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
                                        <HelpCircle className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600">Support Center</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                                    Have questions about cookies or your data? Reach out directly.
                                </p>
                                <div className="grid gap-2 w-full">
                                    <a href="mailto:medraenursing@gmail.com?subject=Cookie%20Policy%20Inquiry" className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-all hover:bg-gray-50 active:scale-[0.98] w-full overflow-hidden">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Mail className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors flex-shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase">Email Us</span>
                                                <span className="text-xs font-semibold text-gray-800 truncate">medraenursing@gmail.com</span>
                                            </div>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-opacity flex-shrink-0" />
                                    </a>
                                    <a href="https://wa.me/254704473503" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-all hover:bg-gray-50 active:scale-[0.98] w-full overflow-hidden">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <MessageSquare className="h-4 w-4 text-gray-500 group-hover:text-green-600 transition-colors flex-shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase">WhatsApp</span>
                                                <span className="text-xs font-semibold text-gray-800">0704 473 503</span>
                                            </div>
                                        </div>
                                        <Smartphone className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-opacity flex-shrink-0" />
                                    </a>
                                </div>
                                <p className="mt-4 text-[10px] text-center text-gray-500 italic">Typical response time: &lt; 24 hours</p>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 md:max-w-full md:px-4 lg:px-6 min-w-0">
                        {/* Hero Banner - full width on mobile */}
                        <div className="relative overflow-hidden md:rounded-xl bg-amber-50/50 p-6 md:p-16 -mb-2 md:border md:border-amber-100 mx-0 md:mx-0">
                            <div className="absolute top-0 right-0 w-1/2 h-full opacity-40 pointer-events-none">
                                <img
                                    src="/terms%20(3).png"
                                    alt=""
                                    className="w-full h-full object-contain object-right-top transform translate-x-10 -translate-y-4"
                                    loading="lazy"
                                    style={{
                                        maskImage: 'linear-gradient(to left, black 20%, transparent 100%)',
                                        WebkitMaskImage: 'linear-gradient(to left, black 20%, transparent 100%)'
                                    }}
                                />
                            </div>
                            <div className="relative z-10 max-w-2xl">
                                <div className="flex items-center gap-2 mb-2 md:mb-3">
                                    <Cookie className="h-6 w-6 md:h-8 md:w-8 text-amber-600" />
                                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
                                        Cookie Policy
                                    </h1>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 font-medium text-xs md:text-sm">
                                    <p className="bg-white/80 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full shadow-sm border border-slate-100">
                                        Effective Date: Feb 2026
                                    </p>
                                    <span className="text-slate-300">•</span>
                                    <p>v1.0.1</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 md:space-y-2 pb-4 px-3 md:px-0 pt-4 md:pt-0">

                            {/* Section 1 - What Are Cookies */}
                            <section id="what-are-cookies" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-2 flex items-center gap-2 md:gap-3">
                                    <Info className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                                    1. What Are Cookies
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        Cookies are small text files that websites place on your device (computer, smartphone, or tablet) when you visit. They help websites remember information about your visit, making your experience smoother and more personalized.
                                    </p>
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 md:p-5 flex items-start gap-3">
                                        <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-800">
                                            <strong>Why they matter:</strong> Cookies enable essential features like keeping you signed in, remembering your preferences, and helping us improve our services.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Section 2 - How We Use Cookies */}
                            <section id="how-we-use" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Database className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    2. How We Use Cookies
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        At Medrae, we use cookies to enhance your experience across our platform:
                                    </p>
                                    <div className="grid grid-cols-1 gap-2 md:gap-3 w-full">
                                        {[
                                            "Keep you securely signed in",
                                            "Remember your preferences and settings",
                                            "Improve platform performance and speed",
                                            "Understand how you interact with content",
                                            "Identify and fix technical issues"
                                        ].map((text, i) => (
                                            <div key={i} className="flex items-center gap-3 border border-gray-200 bg-white rounded-lg px-4 py-2 text-sm text-gray-700 w-full overflow-hidden">
                                                <CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                                <span className="truncate">{text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Section 3 - Types of Cookies */}
                            <section id="types" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Cookie className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    3. Types of Cookies We Use
                                </h2>
                                <div className="space-y-3 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base mb-3">
                                        We use different categories of cookies to provide various functionalities:
                                    </p>
                                    <div className="grid gap-3">
                                        {[
                                            {
                                                type: "Essential Cookies",
                                                desc: "Required for basic functionality like authentication, security, and network management. Cannot be disabled.",
                                                icon: <ShieldCheck className="h-4 w-4 text-green-600" />
                                            },
                                            {
                                                type: "Preference Cookies",
                                                desc: "Remember your settings, such as language preferences and theme choices.",
                                                icon: <Settings className="h-4 w-4 text-blue-600" />
                                            },
                                            {
                                                type: "Analytics Cookies",
                                                desc: "Help us understand how users interact with Medrae to improve performance and user experience.",
                                                icon: <Eye className="h-4 w-4 text-purple-600" />
                                            },
                                            {
                                                type: "Performance Cookies",
                                                desc: "Monitor and optimize platform speed, load times, and overall performance.",
                                                icon: <Clock className="h-4 w-4 text-amber-600" />
                                            }
                                        ].map((item, i) => (
                                            <div key={i} className="flex flex-col p-3 md:p-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {item.icon}
                                                    <span className="font-bold text-gray-900 text-sm">{item.type}</span>
                                                </div>
                                                <span className="text-sm text-gray-600 ml-6">{item.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Section 4 - Third-Party Cookies */}
                            <section id="third-party" className="scroll-mt-20 md:scroll-mt-28 bg-white p-4 md:p-2 rounded-xl border border-gray-200 w-full overflow-hidden">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Globe className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    4. Third-Party Cookies
                                </h2>
                                <div className="space-y-3 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        Some of our pages may include content from third-party services that set their own cookies. These include:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-gray-700">
                                        <li>Analytics providers to help us understand user behavior</li>
                                        <li>Payment processors for secure transactions</li>
                                        <li>Embedded content from trusted educational platforms</li>
                                    </ul>
                                    <p className="text-sm text-gray-600 mt-2">
                                        We do not control these third-party cookies. We recommend reviewing their privacy policies for more information.
                                    </p>
                                </div>
                            </section>

                            {/* Section 5 - Managing Cookies */}
                            <section id="control" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Settings className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    5. Managing Your Cookie Preferences
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        You have full control over your cookie preferences. Here's how you can manage them:
                                    </p>
                                    <div className="grid gap-3">
                                        {[
                                            {
                                                title: "Browser Settings",
                                                desc: "Most browsers allow you to block or delete cookies. Check your browser's settings menu for options.",
                                                icon: <Settings className="h-4 w-4 text-gray-500" />
                                            },
                                            {
                                                title: "Cookie Consent Banner",
                                                desc: "When you first visit Medrae, you'll see a cookie banner where you can choose your preferences.",
                                                icon: <Cookie className="h-4 w-4 text-amber-500" />
                                            },
                                            {
                                                title: "Withdraw Consent",
                                                desc: "You can change your preferences at any time by clicking the cookie settings link in our footer.",
                                                icon: <AlertTriangle className="h-4 w-4 text-orange-500" />
                                            }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 md:p-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
                                                <div className="mt-1 p-2 bg-gray-50 rounded-lg flex-shrink-0">
                                                    {item.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-gray-900 text-sm block">{item.title}</span>
                                                    <p className="text-sm text-gray-600">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 md:p-5 flex items-start gap-3 mt-3 overflow-hidden">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-800">
                                            <strong>Note:</strong> Disabling essential cookies may affect your ability to use certain features of Medrae, such as staying signed in.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Section 6 - Security & Privacy */}
                            <section id="security" className="scroll-mt-20 md:scroll-mt-28 border-t border-gray-200 pt-8 md:pt-10 w-full overflow-hidden">
                                <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <LockKeyhole className="h-5 w-5 md:h-5 md:w-5 text-gray-700" />
                                    6. Security & Privacy Considerations
                                </h2>
                                <div className="space-y-3 text-gray-600 leading-relaxed">
                                    <p className="text-sm text-gray-700">
                                        We take your privacy seriously. Cookies are used responsibly and never to collect sensitive personal information without your explicit consent.
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        All data collected through cookies is handled in accordance with our Privacy Policy and applicable data protection laws.
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        We do not use cookies for advertising profiling or any purposes that compromise your privacy.
                                    </p>
                                </div>
                            </section>

                            {/* Section 7 - Policy Updates */}
                            <section id="updates" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <ScrollText className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    7. Policy Updates
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        We may update this Cookie Policy periodically to reflect changes in technology, legal requirements, or our practices.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        When significant changes are made, we will notify you through the platform or via email.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        The latest version of this policy will always be available on this page, with the effective date clearly stated.
                                    </p>
                                </div>
                            </section>

                            {/* Section 8 - Contact */}
                            <section id="contact" className="scroll-mt-20 md:scroll-mt-28">
                                <div className="relative overflow-hidden bg-amber-600 text-white p-5 md:p-10 rounded-xl md:rounded-xl shadow-xl shadow-amber-600/20">
                                    <Cookie className="absolute -right-10 -bottom-10 h-48 md:h-64 w-48 md:w-64 opacity-10 -rotate-12 pointer-events-none" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                                                <Mail className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                            </div>
                                            <h2 className="text-lg md:text-3xl font-bold m-0 tracking-tight">8. Contact Us</h2>
                                        </div>
                                        <p className="mb-4 md:mb-2 opacity-90 leading-relaxed text-sm md:text-base max-w-xl">
                                            Have questions about our Cookie Policy, or need help managing your cookie preferences?
                                            Our support team is here to assist you.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                            <a href="mailto:medraenursing@gmail.com?subject=Cookie%20Policy%20Inquiry" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] overflow-hidden min-w-0">
                                                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white text-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                        <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-bold opacity-70 mb-0.5">Official Email</p>
                                                        <p className="text-xs md:text-sm font-bold truncate">medraenursing@gmail.com</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0 ml-1" />
                                            </a>
                                            <a href="tel:0717517371" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] overflow-hidden min-w-0">
                                                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                        <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-bold opacity-70 mb-0.5">Direct Call</p>
                                                        <p className="text-xs md:text-sm font-bold">0717 517 371</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0 ml-1" />
                                            </a>
                                            <a href="https://wa.me/254704473503" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] overflow-hidden min-w-0">
                                                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-white text-green-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                        <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] md:text-[9px] uppercase tracking-widest font-bold opacity-70 mb-0.5">WhatsApp Support</p>
                                                        <p className="text-xs md:text-sm font-bold">0704 473 503</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0 ml-1" />
                                            </a>
                                        </div>
                                        <p className="mt-6 md:mt-8 text-[10px] md:text-xs opacity-70 italic">
                                            * We aim to respond to all cookie-related inquiries within 24-48 business hours.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Footer */}
                        <footer className="mt-16 md:mt-20 pt-8 md:pt-10 border-t border-gray-200 px-3 md:px-0">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 text-xs text-gray-500">
                                <div className="text-center md:text-left space-y-0.5 md:space-y-1">
                                    <p className="font-bold text-gray-900 uppercase tracking-tighter italic text-sm">
                                        Medrae Nursing
                                    </p>
                                    <p className="text-[10px] md:text-xs">© {currentYear} All Rights Reserved.</p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                                    <button onClick={() => navigate("/terms")} className="px-2.5 md:px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-[10px] md:text-xs whitespace-nowrap">
                                        Terms of Service
                                    </button>
                                    <button onClick={() => navigate("/privacy")} className="px-2.5 md:px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-[10px] md:text-xs whitespace-nowrap">
                                        Privacy Policy
                                    </button>
                                    <button onClick={() => navigate(-1)} className="px-2.5 md:px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold transition text-[10px] md:text-xs whitespace-nowrap">
                                        Back to App
                                    </button>
                                </div>
                            </div>
                        </footer>
                    </div>
                </div>
            </main>
        </div>
    );
}