"use client";

import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Store,
    ShieldCheck,
    Scale,
    ScrollText,
    ExternalLink,
    Lock,
    AlertTriangle,
    Compass,
    FileText,
    Mail,
    MessageSquare,
    Smartphone,
    HelpCircle,
    ArrowRight,
    Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const sections = [
        { id: "general", title: "1. General Rules", icon: <ShieldCheck className="h-4 w-4" /> },
        { id: "usage", title: "2. Platform Usage", icon: <ScrollText className="h-4 w-4" /> },
        { id: "marketplace", title: "3. NursMartt Rules", icon: <Store className="h-4 w-4" /> },
        { id: "responsibilities", title: "4. User Responsibilities", icon: <FileText className="h-4 w-4" /> },
        { id: "privacy", title: "5. Privacy & Safety", icon: <Lock className="h-4 w-4" /> },
        { id: "content", title: "6. Content Standards", icon: <ScrollText className="h-4 w-4" /> },
        { id: "property", title: "7. Intellectual Property", icon: <FileText className="h-4 w-4" /> },
        { id: "liability", title: "8. Limitation of Liability", icon: <AlertTriangle className="h-4 w-4" /> },
        { id: "survival-hub", title: "9. Survival Hub", icon: <Compass className="h-4 w-4" /> },
        { id: "contact", title: "10. Contact & Support", icon: <Mail className="h-4 w-4" /> },
    ];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="min-h-screen w-full py-0 md:py-2 bg-white text-gray-900 px-0 md:px-2 font-sans antialiased transition-colors duration-300">

            {/* Header / Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-0 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
                    <Button
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-1.5 md:gap-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm text-xs md:text-sm h-8 md:h-9 px-2.5 md:px-3 rounded-lg md:rounded-xl"
                    >
                        <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        Back
                    </Button>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <div className="hover:bg-blue-50 p-1 md:p-1.5 rounded-lg">
                            <Scale className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                        </div>
                        <span className="font-bold text-sm md:text-lg tracking-tight">Legal Center</span>
                    </div>
                    <div className="w-16 md:w-20" />
                </div>
            </header>

            <main className="w-full px-0 md:px-4 py-2">
                <div className="w-full flex flex-col lg:flex-row gap-2 lg:gap-2 justify-center">

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
                        <div className="relative overflow-hidden rounded-xl bg-slate-50/50 border border-slate-100 p-2">
                            <div className="absolute -top-4 -right-4 w-32 h-32 opacity-30 pointer-events-none">
                                <img
                                    src="/terms%20(1).png"
                                    alt=""
                                    className="w-full h-full object-contain transform rotate-12"
                                    loading="lazy"
                                    style={{
                                        maskImage: 'radial-gradient(circle, black 0%, transparent 70%)',
                                        WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 70%)'
                                    }}
                                />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 flex items-center gap-2">
                                    <span className="h-[1px] w-4 bg-slate-200"></span>
                                    On this page
                                </p>
                                <nav className="space-y-1">
                                    {sections.map((section) => (
                                        <button
                                            key={section.id}
                                            onClick={() => scrollToSection(section.id)}
                                            className="group flex items-center w-full text-left px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl transition-all duration-200 shadow-sm shadow-transparent hover:shadow-slate-200/50 border border-transparent hover:border-slate-100"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-3 group-hover:bg-blue-400 transition-colors"></span>
                                            {section.title}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        <Separator className="my-2" />

                        {/* Support Card in Sidebar */}
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
                                    <HelpCircle className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600">Support</span>
                            </div>
                            <div className="grid gap-2">
                                <a href="mailto:medraenursing@gmail.com" className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
                                    <Mail className="h-3.5 w-3.5" /> medraenursing@gmail.com
                                </a>
                                <a href="tel:0717517371" className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors">
                                    <Phone className="h-3.5 w-3.5" /> 0717 517 371
                                </a>
                                <a href="https://wa.me/254704473503" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gray-600 hover:text-green-600 transition-colors">
                                    <MessageSquare className="h-3.5 w-3.5" /> 0704 473 503
                                </a>
                            </div>
                        </div>
                        <Separator className="my-2" />
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 text-xs"
                            onClick={() => navigate("/privacy")}
                        >
                            <Lock className="h-4 w-4" />
                            Privacy Policy
                        </Button>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full max-w-[960px] mx-auto">
                        {/* Hero Banner */}
                        <div className="mb-2 md:mb-2 px-3 md:px-0 pt-2 md:pt-0">
                            <h1 className="text-2xl md:text-3xl lg:text-3xl font-extrabold tracking-tight mb-1 md:mb-2">
                                Terms & Conditions
                            </h1>
                            <p className="text-slate-500 text-sm md:text-lg">
                                Last updated: February 2026 • 8 minute read
                            </p>
                        </div>

                        <div className="prose prose-slate max-w-none space-y-2 md:space-y-2 px-3 md:px-0">

                            {/* Section 1 - General Rules */}
                            <section id="general" className="scroll-mt-20 md:scroll-mt-28">
                                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-2">
                                    <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                                    <h2 className="text-xl md:text-2xl font-bold m-0">1. General Rules</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500 text-sm md:text-base">
                                    Medrae is a platform dedicated to supporting nursing students with revision materials, study notes, and educational resources. All users must use the platform responsibly and ethically. Creating multiple accounts to bypass rules or gain an unfair advantage is strictly prohibited. Providing false information, impersonating other users, or attempting to manipulate the platform in any way may result in immediate suspension or permanent account termination.
                                </p>
                            </section>

                            {/* Section 2 - Platform Usage */}
                            <section id="usage" className="scroll-mt-20 md:scroll-mt-28 relative overflow-hidden rounded-xl bg-blue-50/40 md:border md:border-blue-100/50 p-4 md:p-1 my-8 md:my-10 group">
                                <div className="absolute top-0 right-0 w-2/5 h-full pointer-events-none transition-transform duration-500 group-hover:scale-105 hidden md:block">
                                    <img
                                        src="/terms%20(2).png"
                                        alt=""
                                        className="w-full h-full object-contain object-right"
                                        loading="lazy"
                                        style={{
                                            maskImage: 'linear-gradient(to left, black 10%, transparent 90%)',
                                            WebkitMaskImage: 'linear-gradient(to left, black 10%, transparent 90%)'
                                        }}
                                    />
                                </div>
                                <div className="relative z-10 md:max-w-[70%]">
                                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-2">
                                        <div className="p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl shadow-sm border border-blue-100">
                                            <ScrollText className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0">2. Platform Usage Guidelines</h2>
                                    </div>
                                    <p className="leading-relaxed text-slate-600 text-sm md:text-lg">
                                        Medrae is intended solely for <span className="text-blue-700 font-medium">educational purposes</span>.
                                        The platform must never be used for exam malpractice, cheating, or sharing answers during real exams.
                                        Posting misleading, false, or harmful information is strictly prohibited. Users should only
                                        upload content that they have the right to share.
                                    </p>
                                </div>
                            </section>

                            {/* Section 3 - NursMartt */}
                            <section id="marketplace" className="scroll-mt-20 md:scroll-mt-28 bg-blue-50 p-4 md:p-2 rounded-xl md:rounded-2xl border border-blue-100">
                                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
                                    <Store className="h-5 w-5 md:h-6 md:w-6" />
                                    3. NursMartt Marketplace
                                </h2>
                                <p className="leading-relaxed text-slate-500 text-sm md:text-base">
                                    NursMartt is the dedicated branch of Medrae for buying and selling study materials. All listings must be accurate. Medrae does not directly facilitate payments and is not liable for disputes between buyers and sellers. Compliance with Kenyan laws regarding sales, safety, and ownership is mandatory.
                                </p>
                            </section>

                            {/* Section 4 - User Responsibilities */}
                            <section id="responsibilities" className="scroll-mt-20 md:scroll-mt-28">
                                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                                    <h2 className="text-xl md:text-2xl font-bold m-0">4. User Responsibilities</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500 text-sm md:text-base">
                                    Users are responsible for maintaining the confidentiality of their account credentials. Any activity under your account is your responsibility. Report unauthorized use immediately. Users must not share accounts, engage in harassment, or use the platform for illegal purposes.
                                </p>
                            </section>

                            {/* Section 5 - Privacy & Safety */}
                            <section id="privacy" className="scroll-mt-20 md:scroll-mt-28">
                                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                    <Lock className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                                    <h2 className="text-xl md:text-2xl font-bold m-0">5. Privacy and Safety</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500 text-sm md:text-base">
                                    Medrae respects user privacy and collects information to improve services. Users must not share others' contact details without consent. When meeting for transactions, always choose safe, public locations. Use of Medrae is also governed by our
                                    <Button variant="link" className="px-1 text-blue-600 font-bold h-auto text-sm md:text-base" onClick={() => navigate("/privacy")}>
                                        Privacy Policy <ExternalLink className="h-3 w-3 ml-1" />
                                    </Button>.
                                </p>
                            </section>

                            {/* Section 6 - Content Standards */}
                            <section id="content" className="scroll-mt-20 md:scroll-mt-28">
                                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                    <ScrollText className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                                    <h2 className="text-xl md:text-2xl font-bold m-0">6. Content Standards</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500 text-sm md:text-base">
                                    Users are responsible for all content they upload, post, or share on Medrae.
                                    Content must be accurate, respectful, and lawful. The following are strictly prohibited:
                                </p>
                                <ul className="mt-3 md:mt-4 space-y-1.5 md:space-y-2 text-slate-500 text-sm md:text-base">
                                    <li>• False, misleading, or fraudulent information.</li>
                                    <li>• Offensive, abusive, defamatory, or discriminatory content.</li>
                                    <li>• Copyright-infringing materials uploaded without permission.</li>
                                    <li>• Spam, scams, or unauthorized advertisements.</li>
                                    <li>• Content that promotes cheating or academic dishonesty.</li>
                                </ul>
                                <p className="leading-relaxed text-slate-500 mt-3 md:mt-4 text-sm md:text-base">
                                    Medrae reserves the right to remove any content that violates these standards
                                    and to suspend or terminate accounts involved in repeated violations.
                                </p>
                            </section>

                            {/* Section 7 - Intellectual Property */}
                            <section id="property" className="scroll-mt-20 md:scroll-mt-28 bg-slate-50 p-4 md:p-2 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-slate-700" />
                                    <h2 className="text-xl md:text-2xl font-bold m-0">7. Intellectual Property</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500 text-sm md:text-base">
                                    All platform content, including logos, branding, design elements, study tools,
                                    text, graphics, and software, is owned by or licensed to Medrae and is protected
                                    under applicable intellectual property laws.
                                </p>
                                <p className="leading-relaxed text-slate-500 mt-3 md:mt-4 text-sm md:text-base">
                                    Users may access content for personal educational use only. You may not copy,
                                    reproduce, distribute, modify, sell, or exploit any part of the platform
                                    without prior written permission from Medrae.
                                </p>
                                <p className="leading-relaxed text-slate-500 mt-3 md:mt-4 text-sm md:text-base">
                                    By submitting content to Medrae, you confirm that you have the right to share it
                                    and grant Medrae a non-exclusive license to use, display, and distribute that
                                    content for platform-related purposes.
                                </p>
                            </section>

                            {/* Section 8 - Limitation of Liability */}
                            <section id="liability" className="scroll-mt-20 md:scroll-mt-28 bg-red-50 p-4 md:p-2 rounded-xl border border-red-100">
                                <div className="flex items-center gap-2 mb-2 md:mb-2 text-red-600">
                                    <AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />
                                    <h2 className="text-xl md:text-2xl font-bold m-0">8. Limitation of Liability</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500 mb-3 md:mb-4 text-sm md:text-base">
                                    Medrae is provided "as is" and does not guarantee uninterrupted service. The platform is not responsible for:
                                </p>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-500 list-none p-0">
                                    <li className="flex items-center gap-2 italic">
                                        <div className="h-1.5 w-1.5 rounded-full bg-destructive" /> Loss of money in transactions
                                    </li>
                                    <li className="flex items-center gap-2 italic">
                                        <div className="h-1.5 w-1.5 rounded-full bg-destructive" /> Technical errors or downtime
                                    </li>
                                    <li className="flex items-center gap-2 italic">
                                        <div className="h-1.5 w-1.5 rounded-full bg-destructive" /> Exam results or outcomes
                                    </li>
                                </ul>
                            </section>

                            {/* Section 9 - Survival Hub */}
                            <section id="survival-hub" className="scroll-mt-20 md:scroll-mt-28">
                                <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-2 flex items-center gap-2 md:gap-3 text-gray-900">
                                    <Compass className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                                    9. Student Survival Hub (Educational Support Tools)
                                </h2>
                                <div className="space-y-3 md:space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700 text-sm md:text-base">
                                        Medrae provides a Student Survival Hub designed to support nursing students during exams, clinical placements, and training activities. This feature includes access to exam centers, student housing, nearby hospitals, placement sites, and peer reviews.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        All information provided in the Survival Hub is for educational and informational purposes only. While we strive for accuracy, Medrae does not guarantee the completeness, reliability, or real-time accuracy of listings such as housing availability, hospital proximity, or placement opportunities.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        Users are responsible for verifying critical information before making decisions such as accommodation booking, clinical attendance, or travel arrangements.
                                    </p>
                                    <p className="text-sm md:text-base">
                                        The platform may use location-based data to improve recommendations, but no sensitive medical decisions or emergency services are provided through this feature.
                                    </p>
                                </div>
                            </section>

                            {/* Section 10 - Contact & Support (NEW) */}
                            <section id="contact" className="scroll-mt-20 md:scroll-mt-28">
                                <div className="relative overflow-hidden bg-primary text-primary-foreground p-5 md:p-10 rounded-xl md:rounded-xl shadow-xl shadow-primary/20">
                                    <ShieldCheck className="absolute -right-10 -bottom-10 h-48 md:h-64 w-48 md:w-64 opacity-10 -rotate-12 pointer-events-none" />
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                                <Mail className="h-5 w-5 md:h-6 md:w-6 text-white" />
                                            </div>
                                            <h2 className="text-lg md:text-3xl font-bold m-0 tracking-tight">10. Contact & Support</h2>
                                        </div>
                                        <p className="mb-4 md:mb-2 opacity-90 leading-relaxed text-sm md:text-base max-w-xl">
                                            Have questions about these terms or need clarification? Our team is here to help.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                            <a href="mailto:medraenursing@gmail.com" className="group flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 p-4 md:p-5 rounded-xl md:rounded-2xl transition-all active:scale-[0.98]">
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
                                            * We aim to respond to all inquiries within 24-48 business hours.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Professional Footer */}
                        <footer className="mt-16 md:mt-20 pt-8 md:pt-10 border-0 px-3 md:px-0">
                            <div className="grid gap-2 md:gap-2">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-2">
                                    <div>
                                        <h3 className="font-bold text-base md:text-lg text-gray-900">Medrae Nursing</h3>
                                        <p className="text-xs md:text-sm text-gray-500 max-w-sm">
                                            Empowering the next generation of healthcare professionals with quality educational tools.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => navigate("/privacy")}
                                            className="bg-white text-gray-700 border-0 hover:bg-gray-50 shadow-sm text-[10px] md:text-xs h-8 md:h-9"
                                        >
                                            Privacy
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => navigate(-1)}
                                            className="bg-white text-gray-700 border-0 hover:bg-gray-50 shadow-sm text-[10px] md:text-xs h-8 md:h-9"
                                        >
                                            Go Back
                                        </Button>
                                    </div>
                                </div>
                                <Separator className="bg-gray-200" />
                                <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-[10px] md:text-xs text-gray-500 pb-8 md:pb-10">
                                    <p>© {currentYear} Medrae Nursing. All rights reserved. Kenya.</p>
                                    <p className="text-center md:text-right">
                                        Educational support only. Not a replacement for professional medical advice.
                                    </p>
                                </div>
                            </div>
                        </footer>
                    </div>
                </div>
            </main>
        </div>
    );
}