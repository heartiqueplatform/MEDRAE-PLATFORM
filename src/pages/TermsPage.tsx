"use client";

import { useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Tool,
    ShieldCheck,
    Scale,
    ScrollText,
    ExternalLink,
    Lock,
    AlertTriangle,
    Compass,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();

    const sections = [
        { id: "general", title: "1. General Rules" },
        { id: "usage", title: "2. Platform Usage" },
        { id: "marketplace", title: "3. NursMartt Rules" },
        { id: "responsibilities", title: "4. User Responsibilities" },
        { id: "privacy", title: "5. Privacy & Safety" },
        { id: "content", title: "6. Content Standards" },
        { id: "property", title: "7. Intellectual Property" },
        { id: "liability", title: "8. Limitation of Liability" },
        { id: "Survival Hub", title: "9. Student Survival Hub (Educational Support Tools)" },
    ];

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="min-h-screen w-full min-h-screen py-2 bg-white text-gray-900  px-2 transition-colors duration-300">

            {/* Header / Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-0 bg-white/90 backdrop-blur-md">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <Button
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="hover:bg-blue-50 p-1.5 rounded-lg">
                            <Scale className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Legal Center</span>
                    </div>
                    <div className="w-20" /> {/* Spacer for symmetry */}
                </div>
            </header>

            <main className="w-full px-4 py-2">
                <div className="w-full flex flex-col lg:flex-row gap-2 lg:gap-2 justify-center">

                    {/* Sidebar Navigation - Sticky for Desktop */}
                    <aside className="hidden lg:block w-64 shrink-0 h-fit sticky top-2">
                        <div className="relative overflow-hidden rounded-xl bg-slate-50/50 border border-slate-100 p-2">

                            {/* Background Accent Image */}
                            <div className="absolute -top-4 -right-4 w-32 h-32 opacity-30 pointer-events-none">
                                <img
                                    src="/terms%20(1).png"
                                    alt=""
                                    className="w-full h-full object-contain transform rotate-12"
                                    style={{
                                        maskImage: 'radial-gradient(circle, black 0%, transparent 70%)',
                                        WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 70%)'
                                    }}
                                />
                            </div>

                            {/* Content */}
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
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start gap-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                            onClick={() => navigate("/privacy")}
                        >
                            <Lock className="h-4 w-4" />
                            Privacy Policy
                        </Button>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full max-w-[960px] mx-auto">
                        <div className="mb-2">
                            <h1 className="text-3xl font-extrabold tracking-tight lg:text-3xl mb-2">
                                Terms & Conditions
                            </h1>
                            <p className="text-slate-500 text-lg">
                                Last updated: February 2026 • 8 minute read
                            </p>
                        </div>

                        <div className="prose prose-slate  max-w-none space-y-2">

                            <section id="general" className="scroll-mt-2">
                                <div className="flex items-center gap-3 mb-2">
                                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                                    <h2 className="text-2xl font-bold m-0">1. General Rules</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500">
                                    Medrae is a platform dedicated to supporting nursing students with revision materials, study notes, and educational resources. All users must use the platform responsibly and ethically. Creating multiple accounts to bypass rules or gain an unfair advantage is strictly prohibited. Providing false information, impersonating other users, or attempting to manipulate the platform in any way may result in immediate suspension or permanent account termination.
                                </p>
                            </section>

                            <section id="usage" className="scroll-mt-22 relative overflow-hidden rounded-xl bg-blue-50/40 border border-blue-100/50 p-1 my-10 group">
                                {/* Background Decorative Image */}
                                <div className="absolute top-0 right-0 w-2/5 h-full pointer-events-none transition-transform duration-500 group-hover:scale-105">
                                    <img
                                        src="/terms%20(2).png"
                                        alt=""
                                        className="w-full h-full object-contain object-right"
                                        style={{
                                            maskImage: 'linear-gradient(to left, black 10%, transparent 90%)',
                                            WebkitMaskImage: 'linear-gradient(to left, black 10%, transparent 90%)'
                                        }}
                                    />
                                </div>

                                {/* Content Layer */}
                                <div className="relative z-10 max-w-[70%]">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-white rounded-xl shadow-sm border border-blue-100">
                                            <ScrollText className="h-6 w-6 text-blue-500" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-slate-800 m-0">
                                            2. Platform Usage Guidelines
                                        </h2>
                                    </div>

                                    <p className="leading-relaxed text-slate-600 text-lg">
                                        Medrae is intended solely for <span className="text-blue-700 font-medium">educational purposes</span>.
                                        The platform must never be used for exam malpractice, cheating, or sharing answers during real exams.
                                        Posting misleading, false, or harmful information is strictly prohibited. Users should only
                                        upload content that they have the right to share.
                                    </p>
                                </div>
                            </section>
                            <section id="marketplace" className="scroll-mt-28 bg-blue-50 p-2 rounded-2xl border border-blue-100">
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    3. NursMartt Marketplace
                                </h2>
                                <p className="leading-relaxed text-slate-500">
                                    NursMartt is the dedicated branch of Medrae for buying and selling study materials. All listings must be accurate. Medrae does not directly facilitate payments and is not liable for disputes between buyers and sellers. Compliance with Kenyan laws regarding sales, safety, and ownership is mandatory.
                                </p>
                            </section>

                            <section id="privacy" className="scroll-mt-28">
                                <div className="flex items-center gap-3 mb-4">
                                    <Lock className="h-6 w-6 text-blue-600" />
                                    <h2 className="text-2xl font-bold m-0">5. Privacy and Safety</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500">
                                    Medrae respects user privacy and collects information to improve services. Users must not share others’ contact details without consent. When meeting for transactions, always choose safe, public locations. Use of Medrae is also governed by our
                                    <Button variant="link" className="px-1 text-blue-600 font-bold h-auto" onClick={() => navigate("/privacy")}>
                                        Privacy Policy <ExternalLink className="h-3 w-3 ml-1" />
                                    </Button>.
                                </p>
                            </section>
                            {/* 6. Content Standards */}
                            <section id="content" className="scroll-mt-28">
                                <div className="flex items-center gap-3 mb-4">
                                    <ScrollText className="h-6 w-6 text-blue-600" />
                                    <h2 className="text-2xl font-bold m-0">6. Content Standards</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500">
                                    Users are responsible for all content they upload, post, or share on Medrae.
                                    Content must be accurate, respectful, and lawful. The following are strictly prohibited:
                                </p>

                                <ul className="mt-4 space-y-2 text-slate-500">
                                    <li>• False, misleading, or fraudulent information.</li>
                                    <li>• Offensive, abusive, defamatory, or discriminatory content.</li>
                                    <li>• Copyright-infringing materials uploaded without permission.</li>
                                    <li>• Spam, scams, or unauthorized advertisements.</li>
                                    <li>• Content that promotes cheating or academic dishonesty.</li>
                                </ul>

                                <p className="leading-relaxed text-slate-500 mt-4">
                                    Medrae reserves the right to remove any content that violates these standards
                                    and to suspend or terminate accounts involved in repeated violations.
                                </p>
                            </section>

                            {/* 7. Intellectual Property */}
                            <section
                                id="property"
                                className="scroll-mt-28 bg-slate-50 p-2 rounded-xl border border-slate-200"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    < FileText className="h-6 w-6 text-slate-700" />
                                    <h2 className="text-2xl font-bold m-0">7. Intellectual Property</h2>
                                </div>

                                <p className="leading-relaxed text-slate-500">
                                    All platform content, including logos, branding, design elements, study tools,
                                    text, graphics, and software, is owned by or licensed to Medrae and is protected
                                    under applicable intellectual property laws.
                                </p>

                                <p className="leading-relaxed text-slate-500 mt-4">
                                    Users may access content for personal educational use only. You may not copy,
                                    reproduce, distribute, modify, sell, or exploit any part of the platform
                                    without prior written permission from Medrae.
                                </p>

                                <p className="leading-relaxed text-slate-500 mt-4">
                                    By submitting content to Medrae, you confirm that you have the right to share it
                                    and grant Medrae a non-exclusive license to use, display, and distribute that
                                    content for platform-related purposes.
                                </p>
                            </section>
                            <section id="liability" className="scroll-mt-28 bg-red-50 p-2 rounded-xl border border-red-100">
                                <div className="flex items-center gap-2 mb-2 text-red-600">
                                    <AlertTriangle className="h-6 w-6" />
                                    <h2 className="text-2xl font-bold m-0">8. Limitation of Liability</h2>
                                </div>
                                <p className="leading-relaxed text-slate-500 mb-4">
                                    Medrae is provided “as is” and does not guarantee uninterrupted service. The platform is not responsible for:
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


                            <section id="survival-hub" className="scroll-mt-28">
                                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 text-gray-900">
                                    <Compass className="h-6 w-6 text-gray-700" />
                                    9. Student Survival Hub (Educational Support Tools)
                                </h2>

                                <div className="space-y-4 text-gray-600 leading-relaxed">
                                    <p className="text-gray-700">
                                        Medrae provides a Student Survival Hub designed to support nursing students during exams, clinical placements, and training activities. This feature includes access to exam centers, student housing, nearby hospitals, placement sites, and peer reviews.
                                    </p>

                                    <p>
                                        All information provided in the Survival Hub is for educational and informational purposes only. While we strive for accuracy, Medrae does not guarantee the completeness, reliability, or real-time accuracy of listings such as housing availability, hospital proximity, or placement opportunities.
                                    </p>

                                    <p>
                                        Users are responsible for verifying critical information before making decisions such as accommodation booking, clinical attendance, or travel arrangements.
                                    </p>

                                    <p>
                                        The platform may use location-based data to improve recommendations, but no sensitive medical decisions or emergency services are provided through this feature.
                                    </p>
                                </div>
                            </section>
                            {/* ... Include remaining sections using the same pattern ... */}

                        </div>
                        {/* Professional Footer Container */}
                        <footer className="mt-20 pt-10 border-0">
                            <div className="grid gap-2">

                                <div className="flex flex-col md:flex-row justify-between items-start gap-2">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">Medrae Nursing</h3>
                                        <p className="text-sm text-gray-500 max-w-sm">
                                            Empowering the next generation of healthcare professionals with quality educational tools.
                                        </p>
                                    </div>

                                    {/* Buttons (forced light style, no theme dependency) */}
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => navigate("/privacy")}
                                            className="bg-white text-gray-700 border-0 hover:bg-gray-50 shadow-sm"
                                        >
                                            Privacy
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={() => navigate(-1)}
                                            className="bg-white text-gray-700 border-0 hover:bg-gray-50 shadow-sm"
                                        >
                                            Go Back
                                        </Button>
                                    </div>
                                </div>
                                <Separator className="bg-gray-200" />
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 pb-10">
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