import { Link } from "react-router-dom";
import {
    BookOpenCheck,
    FileQuestion,
    FileText,
    GraduationCap,
    ClipboardCheck,
    Trophy,
    Home,
    Mail,
    Phone,
    ShieldCheck,
} from "lucide-react";

/**
 * Shared footer for all public SEO pages.
 * Static only. No Supabase, no data fetching.
 * Links every SEO page to every other SEO page for internal linking.
 */
export default function SeoFooter() {
    const currentYear = new Date().getFullYear();

    const seoPages = [
        {
            to: "/nursing-revision-kenya",
            label: "Nursing Revision in Kenya",
            description: "Complete hub for nursing revision",
            icon: Home,
        },
        {
            to: "/nck-exam-revision",
            label: "NCK Exam Revision",
            description: "How to prepare for the NCK exam",
            icon: BookOpenCheck,
        },
        {
            to: "/nck-exam-questions",
            label: "NCK Exam Questions",
            description: "Question formats and high-yield topics",
            icon: FileQuestion,
        },
        {
            to: "/nck-past-papers",
            label: "NCK Past Papers",
            description: "Using past-paper-style questions",
            icon: FileText,
        },
        {
            to: "/nck-exam-preparation",
            label: "NCK Exam Preparation",
            description: "From registration to exam day",
            icon: ClipboardCheck,
        },
        {
            to: "/krchn-revision",
            label: "KRCHN Revision",
            description: "Diploma-specific revision guide",
            icon: GraduationCap,
        },
        {
            to: "/medrae-nursing-merit-cup",
            label: "Medrae Nursing Merit Cup",
            description: "National nursing excellence olympiad",
            icon: Trophy,
        },
    ];

    return (
        <footer className="mt-16 w-full border-t border-slate-100 bg-white">
            <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
                {/* Brand row */}
                <div className="flex flex-col items-center text-center">
                    <img
                        src="/pwa-512x512.png"
                        alt="Medrae Nursing"
                        className="h-12 w-12 rounded-xl object-contain"
                    />
                    <p className="mt-3 text-sm font-bold tracking-tight sm:text-base">
                        <span className="text-red-600">MEDRAE</span>
                        <span className="text-slate-800 ml-1">NURSING</span>
                    </p>
                    <p className="mt-1 max-w-md text-xs text-slate-500 sm:text-sm">
                        Kenya&rsquo;s nursing revision platform — NCK-aligned
                        questions, rationales, and progress tracking built for
                        the KRCHN curriculum.
                    </p>
                </div>

                {/* SEO pages grid */}
                <div className="mt-10">
                    <h2 className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:text-xs">
                        Explore Nursing Revision Guides
                    </h2>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {seoPages.map((page) => {
                            const Icon = page.icon;
                            return (
                                <Link
                                    key={page.to}
                                    to={page.to}
                                    className="group flex items-start gap-3 rounded-xl bg-slate-50 p-4 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                >
                                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white">
                                        <Icon className="h-4 w-4 text-blue-700" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-slate-900 group-hover:text-blue-800 sm:text-sm">
                                            {page.label}
                                        </p>
                                        <p className="mt-0.5 text-[11px] leading-5 text-slate-500 sm:text-xs">
                                            {page.description}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Primary action row */}
                <div className="mt-10 rounded-xl bg-blue-50 p-5 text-center sm:p-6">
                    <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                        Ready to start revising?
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                        Practise NCK-style questions, track your weak areas,
                        and build clinical reasoning on Medrae.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Link
                            to="/nursing"
                            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-sm"
                        >
                            Start revising on Medrae
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-50 hover:ring-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:text-sm"
                        >
                            Create a free account
                        </Link>
                    </div>
                </div>

                {/* Contact + trust row */}
                <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:text-xs">
                            About
                        </h3>
                        <ul className="mt-3 space-y-2 text-[12px] leading-6 text-slate-600 sm:text-sm">
                            <li className="flex items-start gap-2">
                                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
                                <span>
                                    Built for Kenyan nursing students preparing
                                    for NCK and KRCHN licensure exams.
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:text-xs">
                            Contact
                        </h3>
                        <ul className="mt-3 space-y-2 text-[12px] leading-6 text-slate-600 sm:text-sm">
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 flex-shrink-0 text-blue-700" />
                                <a
                                    href="mailto:medraenursing@gmail.com"
                                    className="hover:text-slate-900 hover:underline"
                                >
                                    medraenursing@gmail.com
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 flex-shrink-0 text-blue-700" />
                                <a
                                    href="tel:0717517371"
                                    className="hover:text-slate-900 hover:underline"
                                >
                                    0717 517 371
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 sm:text-xs">
                            Legal
                        </h3>
                        <ul className="mt-3 space-y-2 text-[12px] leading-6 text-slate-600 sm:text-sm">
                            <li>
                                <Link
                                    to="/terms"
                                    className="hover:text-slate-900 hover:underline"
                                >
                                    Terms &amp; Conditions
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/privacy"
                                    className="hover:text-slate-900 hover:underline"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/cookies"
                                    className="hover:text-slate-900 hover:underline"
                                >
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 border-t border-slate-100 pt-6 text-center">
                    <p className="text-[11px] text-slate-500 sm:text-xs">
                        © {currentYear} Medrae Nursing. All rights reserved.
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                        Learn. Practice. Advance.
                    </p>
                </div>
            </div>
        </footer>
    );
}