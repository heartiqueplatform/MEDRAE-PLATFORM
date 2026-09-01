"use client";

import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Compass,
    Fingerprint,
    Eye,
    Database,
    LockKeyhole,
    UserCheck,
    Cookie,
    Baby,
    Mail,
    Phone,
    ExternalLink,
    HelpCircle,
    ShieldAlert,
    Smartphone,
    MessageSquare,
    ShieldCheck,
    ArrowRight,
    ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicyPage() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const sections = [
        { id: "collect", title: "1. Information Collection", icon: <Database className="h-5 w-5" /> },
        { id: "use", title: "2. How We Use Data", icon: <Fingerprint className="h-5 w-5" /> },
        { id: "sharing", title: "3. Data Sharing", icon: <Eye className="h-5 w-5" /> },
        { id: "security", title: "4. Data Security", icon: <LockKeyhole className="h-5 w-5" /> },
        { id: "rights", title: "5. Your Rights", icon: <UserCheck className="h-5 w-5" /> },
        { id: "cookies", title: "6. Cookies & Tracking", icon: <Cookie className="h-5 w-5" /> },
        { id: "children", title: "7. Children's Privacy", icon: <Baby className="h-5 w-5" /> },
        { id: "updates", title: "8. Policy Updates", icon: <ScrollText className="h-5 w-5" /> },
        { id: "survival-hub-privacy", title: "9. Student Survival Hub", icon: <Compass className="h-5 w-5" /> },
        { id: "contact", title: "10. Contact Us", icon: <Mail className="h-5 w-5" /> },
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
                        <ShieldAlert className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Privacy Center</span>
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
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                    Sections
                                </p>
                                <nav className="space-y-1.5">
                                    {sections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => scrollToSection(section.id)}
                                            className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-white rounded-xl transition-all duration-200 group border border-transparent hover:border-blue-50 hover:shadow-sm"
                                        >
                                            <span className="text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-200">
                                                {section.icon}
                                            </span>
                                            {section.title}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        <div className="mt-1 p-4 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200/50 relative overflow-hidden group cursor-pointer">
                            <div className="relative z-10">
                                <p className="text-xs font-bold opacity-80 mb-1">Need help?</p>
                                <p className="text-[11px] leading-tight">Contact our legal team for clarification.</p>
                            </div>
                            <div className="absolute -right-2 -bottom-2 opacity-20 transform group-hover:scale-110 transition-transform">
                                <ScrollText className="h-12 w-12" />
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
                                    Have questions about your data or these terms? Reach out directly.
                                </p>
                                <div className="grid gap-2 w-full">
                                    <a href="mailto:medraenursing@gmail.com?subject=Support%20Inquiry%20-%20Medrae" className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-all hover:bg-gray-50 active:scale-[0.98] w-full overflow-hidden">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Mail className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase">Email Us</span>
                                                <span className="text-xs font-semibold text-gray-800 truncate">medraenursing@gmail.com</span>
                                            </div>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-opacity flex-shrink-0" />
                                    </a>
                                    <a href="https://wa.me/254704473503" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-all hover:bg-gray-50 active:scale-[0.98] w-full overflow-hidden">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <MessageSquare className="h-4 w-4 text-gray-500 group-hover:text-green-600 transition-colors" />
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
                    <div className="flex-1 md:max-w-full md:px-4 lg:px-6">
                        {/* Hero Banner - full width on mobile */}
                        <div className="relative overflow-hidden md:rounded-xl bg-slate-50/50 p-6 md:p-16 -mb-2 md:border md:border-slate-100 mx-0 md:mx-0">
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
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 md:mb-4 text-gray-900">
                                    Privacy Policy
                                </h1>
                                <div className="flex items-center gap-2 text-slate-500 font-medium text-xs md:text-sm">
                                    <p className="bg-white/80 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full shadow-sm border border-slate-100">
                                        Effective Date: Feb 2026
                                    </p>
                                    <span className="text-slate-300">•</span>
                                    <p>v1.0.2</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 md:space-y-2 pb-4 px-3 md:px-0 pt-4 md:pt-0">

                            {/* Section 1 - Information Collection */}
                            <section id="collect" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-2 flex items-center gap-2 md:gap-3">
                                    <Database className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                                    1. Information We Collect
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        Medrae collects information that you provide when creating an account, uploading content, or interacting with the platform. This includes:
                                    </p>
                                    <ul className="grid gap-2 md:gap-3 list-none p-0">
                                        {[
                                            "Personal details such as name, email, and phone number",
                                            "Profile information including educational background",
                                            "Uploaded content such as notes and marketplace listings",
                                            "Usage data such as login times and feature interactions"
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-3">
                                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                                                <span className="text-sm text-gray-700">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>

                            {/* Section 2 - How We Use Data */}
                            <section id="use" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Fingerprint className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    2. How We Use Your Information
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        We process your information to maintain a secure and effective learning ecosystem:
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full">
                                        {[
                                            "Improve platform services",
                                            "Ensure a safe environment",
                                            "Enable marketplace transactions",
                                            "Communicate critical updates",
                                            "Analyze learning trends"
                                        ].map((text, i) => (
                                            <div key={i} className="flex items-center gap-3 border border-gray-200 bg-white rounded-lg px-4 py-2 text-sm italic text-gray-700 w-full">
                                                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                                                {text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Section 3 - Data Sharing */}
                            <section id="sharing" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Eye className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    3. Data Sharing
                                </h2>
                                <div className="space-y-3 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        Medrae does not sell, rent, or trade your personal information to third parties for marketing purposes. Data may be shared only:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-2 text-sm text-gray-700">
                                        <li>With your explicit consent</li>
                                        <li>To comply with legal obligations</li>
                                        <li>With service providers bound by confidentiality agreements</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Section 4 - Security */}
                            <section id="security" className="scroll-mt-20 md:scroll-mt-28 bg-white p-4 md:p-2 rounded-xl border border-gray-200 w-full">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <LockKeyhole className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    4. Data Security
                                </h2>
                                <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                                    Medrae implements enterprise-grade technical and organizational measures to protect user data.
                                    While no system is 100% secure, we use encryption and strict access controls to prevent unauthorized disclosure.
                                </p>
                            </section>

                            {/* Section 5 - Rights */}
                            <section id="rights" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    5. User Rights
                                </h2>
                                <div className="grid gap-3 md:gap-4">
                                    {[
                                        { t: "Access", d: "View all personal data stored on our servers." },
                                        { t: "Rectify", d: "Update or correct inaccurate profile details." },
                                        { t: "Erasure", d: "Request deletion of your data (Right to be forgotten)." }
                                    ].map((right, i) => (
                                        <div key={i} className="flex flex-col p-3 md:p-4 rounded-xl border border-gray-200 bg-white">
                                            <span className="font-bold text-gray-900 text-sm uppercase tracking-wider">{right.t}</span>
                                            <span className="text-sm text-gray-600">{right.d}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Section 6 - Cookies */}
                            <section id="cookies" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Cookie className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    6. Cookies & Tracking
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        Medrae uses cookies and similar technologies to improve performance,
                                        remember your preferences, and enhance your overall experience on the platform.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        Cookies help us keep you signed in, understand how users interact with
                                        the platform, and identify technical issues that may affect usability.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        We may use essential cookies, analytics tools, and security-related
                                        tracking technologies. These tools do not sell your personal data
                                        to third parties.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        You can control or disable cookies through your browser settings,
                                        although some parts of Medrae may not function properly if cookies
                                        are restricted.
                                    </p>
                                </div>
                            </section>

                            {/* Section 7 - Children */}
                            <section id="children" className="scroll-mt-20 md:scroll-mt-28 border-t border-gray-200 pt-8 md:pt-10 w-full">
                                <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Baby className="h-5 w-5 md:h-5 md:w-5 text-gray-700" />
                                    7. Children's Privacy
                                </h2>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Medrae is intended for users aged 13 and above. If we discover data from children under 13 has been collected, it is immediately purged from our active databases.
                                </p>
                            </section>

                            {/* Section 8 - Policy Updates */}
                            <section id="updates" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <ScrollText className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    8. Policy Updates
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        We may update this Privacy Policy from time to time to reflect
                                        changes in our services, legal obligations, or security practices.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        When significant changes are made, we will notify users through
                                        the platform, email, or other appropriate communication channels.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        Continued use of Medrae after an updated Privacy Policy becomes
                                        effective constitutes acceptance of the revised terms.
                                    </p>
                                </div>
                            </section>

                            {/* Section 9 - Survival Hub */}
                            <section id="survival-hub-privacy" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Compass className="h-5 w-5" />
                                    9. Student Survival Hub Data & Location Usage
                                </h2>
                                <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                                    <p className="text-gray-700">
                                        The Student Survival Hub collects and processes limited data to provide educational support features such as exam centers, student housing, nearby hospitals, clinical placement sites, and student reviews.
                                    </p>
                                    <p>
                                        This may include general location data, user preferences, and interaction activity within the Survival Hub. This data is used strictly to improve relevance, recommendations, and user experience.
                                    </p>
                                    <p>
                                        Medrae does not use Survival Hub data for surveillance, advertising profiling, or unrelated commercial tracking purposes.
                                    </p>
                                    <p>
                                        Listings such as housing, hospitals, and placement sites may be provided by third-party or user-generated sources. While we aim to keep information accurate, Medrae does not guarantee real-time availability, correctness, or suitability of any listing.
                                    </p>
                                    <p>
                                        Users are responsible for verifying critical details before making decisions related to accommodation, clinical attendance, travel, or academic placement.
                                    </p>
                                    <p>
                                        By using the Survival Hub, users acknowledge that all recommendations are for educational and informational support only and should not be treated as official or guaranteed data.
                                    </p>
                                </div>
                            </section>
                            {/* Section 10 - Contact */}
                            <section id="contact" className="scroll-mt-20 md:scroll-mt-28">
                                <div className="relative overflow-hidden bg-primary text-primary-foreground p-5 md:p-10 rounded-xl md:rounded-xl shadow-xl shadow-primary/20">
                                    <ShieldCheck className="absolute -right-10 -bottom-10 h-48 md:h-64 w-48 md:w-64 opacity-10 -rotate-12 pointer-events-none" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                                <Mail className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                            </div>
                                            <h2 className="text-lg md:text-3xl font-bold m-0 tracking-tight">10. Contact Us</h2>
                                        </div>
                                        <p className="mb-4 md:mb-2 opacity-90 leading-relaxed text-sm md:text-base max-w-xl">
                                            Have specific questions about your data, or wish to exercise your right to erasure?
                                            Our compliance team is ready to assist you through our official channels.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                                            <a href="mailto:medraenursing@gmail.com?subject=Privacy%20Request%20-%20Medrae" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 p-4 md:p-5 rounded-xl md:rounded-2xl transition-all active:scale-[0.98]">
                                                <div className="flex items-center gap-3 md:gap-2">
                                                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white text-primary flex items-center justify-center shadow-lg">
                                                        <Mail className="h-4 w-4 md:h-5 md:w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70 mb-0.5">Official Email</p>
                                                        <p className="text-xs md:text-sm lg:text-base font-bold">medraenursing@gmail.com</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                            </a>
                                            <a href="tel:0717517371" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 p-4 md:p-5 rounded-xl md:rounded-2xl transition-all active:scale-[0.98]">
                                                <div className="flex items-center gap-3 md:gap-2">
                                                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg">
                                                        <Phone className="h-4 w-4 md:h-5 md:w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70 mb-0.5">Direct Call</p>
                                                        <p className="text-xs md:text-sm lg:text-base font-bold">0717 517 371</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                            </a>
                                            <a href="https://wa.me/254704473503" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 p-4 md:p-5 rounded-xl md:rounded-2xl transition-all active:scale-[0.98]">
                                                <div className="flex items-center gap-3 md:gap-4">
                                                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white text-green-600 flex items-center justify-center shadow-lg">
                                                        <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70 mb-0.5">WhatsApp Support</p>
                                                        <p className="text-xs md:text-sm lg:text-base font-bold">0704 473 503</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-4 w-4 md:h-5 md:w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                            </a>
                                        </div>
                                        <p className="mt-6 md:mt-8 text-[10px] md:text-xs opacity-70 italic">
                                            * We aim to respond to all formal privacy requests within 24-48 business hours.
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
                                <div className="flex gap-2 md:gap-4">
                                    <button onClick={() => navigate("/terms")} className="px-2.5 md:px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-[10px] md:text-xs">
                                        Terms of Service
                                    </button>
                                    <button onClick={() => navigate(-1)} className="px-2.5 md:px-3 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold transition text-[10px] md:text-xs">
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