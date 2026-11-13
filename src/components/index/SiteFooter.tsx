// src/components/index/SiteFooter.tsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
    ArrowRight, Mail, Phone, MessageSquare, ExternalLink, Shield, CheckCircle,
    Facebook, Linkedin, Instagram, Twitter, ChevronDown,
} from "lucide-react";

type FooterLink = { label: string; to?: string; soon?: boolean };

const PLATFORM: FooterLink[] = [
    { label: "Student Dashboard", to: "/dashboard/student" },
    { label: "Feed", to: "/feed" },
    { label: "Medrae Quizzes", to: "/Medrae-quizzes" },
    { label: "MedTube", to: "/medtube" },
    { label: "Live Classes", to: "/live-classes" },
    { label: "Institutional Exams", to: "/tutor/exams" },
    { label: "Announcements", to: "/announcements" },
    { label: "Notifications", to: "/notifications" },
    { label: "NursMartt Marketplace", to: "/market" },
    { label: "Survival Hub", to: "/survival-hub" },
    { label: "Exam Centers", to: "/survival-hub/exam-centers" },
    { label: "Housing Board", to: "/survival-hub/housing" },
    { label: "Hospital Placements", to: "/survival-hub/placements" },
    { label: "Exam Buddies", to: "/survival-hub/buddies" },
];

const LEARNING: FooterLink[] = [
    { label: "DCHN / BSN / KRN Curriculum", to: "/nursing" },
    { label: "Unit-Based Revision", to: "/nursing" },
    { label: "Topic Search", to: "/nursing/search" },
    { label: "Study Progress", to: "/progress" },
    { label: "My Mistakes", to: "/my-mistakes" },
    { label: "Assessments", to: "/assessments" },
    { label: "Assessment History", to: "/assessments/history" },
    { label: "Clinical Assessment Notes", to: "/assessment-notes" },
    { label: "Last-Minute Reader", to: "/last-minute" },
    { label: "AI Assistant", to: "/ai-assistant" },
    { label: "Calendar", to: "/calendar" },
    { label: "Resources", to: "/resources" },
    { label: "Study Challenges", to: "/challenge" },
    { label: "Simulation Mode", to: "/simulation/candidate" },
    { label: "Exam Results", to: "/exam/results" },
];

const CPD: FooterLink[] = [
    { label: "CPD Dashboard", to: "/cpd" },
    { label: "CPD Activity Catalog", to: "/cpd/catalog" },
    { label: "My CPD Progress", to: "/cpd/progress" },
    { label: "My Certificates", to: "/cpd/certificates" },
    { label: "Verify a Certificate", to: "/cpd/verify" },
    { label: "My Bookmarks", to: "/cpd/bookmarks" },
    { label: "Apply as Contributor", to: "/cpd/apply" },
    { label: "MedraeCoins Policy", to: "/cpd/coins-policy" },
    { label: "Redeem Coins", to: "/cpd/redeem" },
    { label: "My Activities (Contributor)", to: "/cpd/admin/activities" },
    { label: "Completions (Admin)", to: "/cpd/admin/completions" },
];

const GROUPPAY: FooterLink[] = [
    { label: "GroupPay Home", to: "/grouppay" },
    { label: "Create a Group", to: "/grouppay/create" },
    { label: "My Subscription", to: "/subscription" },
    { label: "Group Pricing", to: "/grouppay" },
];

const GUIDES: FooterLink[] = [
    { label: "Nursing Revision in Kenya", to: "/nursing-revision-kenya" },
    { label: "NCK Exam Revision", to: "/nck-exam-revision" },
    { label: "NCK Exam Questions", to: "/nck-exam-questions" },
    { label: "NCK Past Papers", to: "/nck-past-papers" },
    { label: "NCK Exam Preparation", to: "/nck-exam-preparation" },
    { label: "KRCHN Revision", to: "/krchn-revision" },
    { label: "Medrae Merit Cup", to: "/medrae-nursing-merit-cup" },
];

const ACCOUNT: FooterLink[] = [
    { label: "Login", to: "/login" },
    { label: "Create Account", to: "/register" },
    { label: "My Profile", to: "/profile" },
    { label: "Settings", to: "/settings" },
    { label: "Analytics", to: "/analytics" },
    { label: "Referral Program", to: "/share" },
    { label: "Streak Restore", to: "/streak/restore" },
    { label: "Feedback", to: "/feedback" },
    { label: "Help Center", to: "/help" },
    { label: "User Guide", to: "/guide" },
];

const LEGAL: FooterLink[] = [
    { label: "Terms & Conditions", to: "/terms" },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Cookie Policy", to: "/cookies" },
    { label: "MedraeCoins Policy", to: "/cpd/coins-policy" },
];

/* ── A collapsible column ── */
function FooterColumn({ title, links, open, onToggle }: {
    title: string;
    links: FooterLink[];
    open: boolean;
    onToggle: () => void;
}) {
    const navigate = useNavigate();
    return (
        <div className="border-b border-white/[0.06] md:border-0 py-3 md:py-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between gap-2 md:cursor-default md:pointer-events-none"
                style={{ touchAction: "manipulation" }}
            >
                <h3 className="font-bold text-[11px] md:text-xs uppercase tracking-[0.15em]"
                    style={{ color: "#e6edf3" }}>
                    {title}
                </h3>
                <ChevronDown
                    className={`w-4 h-4 md:hidden transition-transform ${open ? "rotate-180" : ""}`}
                    style={{ color: "#8b949e" }}
                />
            </button>
            <ul className={`mt-2 md:mt-4 space-y-1.5 md:space-y-2 text-[11px] md:text-[12.5px]
                            overflow-hidden transition-all md:!block
                            ${open ? "block" : "hidden md:block"}`}>
                {links.map((link) => (
                    <li key={link.label}>
                        {link.soon ? (
                            <span className="text-[10px] uppercase tracking-wider font-bold"
                                style={{ color: "#6e7681" }}>
                                {link.label} · soon
                            </span>
                        ) : (
                            <button
                                onClick={() => navigate(link.to!)}
                                className="text-left hover:translate-x-0.5 transition-transform inline-block"
                                style={{ color: "#8b949e" }}
                            >
                                {link.label}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function SiteFooter() {
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    const toggle = (key: string) =>
        setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <footer
            id="contact"
            className="pt-8 md:pt-12 pb-6 md:pb-8 px-0 md:px-4"
            style={{ backgroundColor: "#0d1117", color: "#e6edf3" }}
        >
            <div className="max-w-7xl mx-auto px-4 md:px-0">

                {/* ── BRAND + TAGLINE ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 mb-10 md:mb-14">
                    <div className="lg:col-span-5">
                        <div className="flex items-center gap-2 mb-3">
                            <img src="/pwa-192x192.jpeg" className="h-9 w-9 md:h-10 md:w-10 rounded-xl" alt="Medrae" />
                            <div>
                                <p className="text-xl md:text-2xl font-bold leading-tight" style={{ color: "#e6edf3" }}>
                                    Medrae <span style={{ color: "#8b949e" }}>Nursing</span>
                                </p>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#6e7681" }}>
                                    Kenya Nursing Network
                                </p>
                            </div>
                        </div>
                        <p className="text-[12px] md:text-[13px] leading-relaxed max-w-md mb-4"
                            style={{ color: "#8b949e" }}>
                            One platform for every stage of your nursing career — from DCHN, BSN and KRN
                            studies through NCK licensure, CPD, and beyond. Revision, exams, community,
                            and CPD portfolios — all in one place.
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                            {[
                                { label: "DCHN", color: "#1f6feb" },
                                { label: "BSN", color: "#8957e5" },
                                { label: "KRN", color: "#3fb950" },
                                { label: "NCK", color: "#d29922" },
                                { label: "CPD", color: "#f85149" },
                            ].map((badge) => (
                                <span key={badge.label}
                                    className="px-2 py-1 rounded-full"
                                    style={{ backgroundColor: `${badge.color}22`, color: badge.color }}>
                                    {badge.label}
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-4">
                            <Facebook className="w-4 h-4 md:w-5 md:h-5 cursor-pointer hover:scale-110 transition-transform" style={{ color: "#6e7681" }} />
                            <Twitter className="w-4 h-4 md:w-5 md:h-5 cursor-pointer hover:scale-110 transition-transform" style={{ color: "#6e7681" }} />
                            <Linkedin className="w-4 h-4 md:w-5 md:h-5 cursor-pointer hover:scale-110 transition-transform" style={{ color: "#6e7681" }} />
                            <Instagram className="w-4 h-4 md:w-5 md:h-5 cursor-pointer hover:scale-110 transition-transform" style={{ color: "#6e7681" }} />
                        </div>
                    </div>

                    {/* Quick CTA card */}
                    <div className="lg:col-span-7">
                        <div className="rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3"
                            style={{ backgroundColor: "#161b22" }}>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] md:text-[14px] font-bold" style={{ color: "#e6edf3" }}>
                                    Ready to start preparing?
                                </p>
                                <p className="text-[11px] md:text-[12px] mt-0.5" style={{ color: "#8b949e" }}>
                                    Create your free account and access 6,500+ questions, AI tutoring, CPD portfolio, and more.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/register")}
                                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-[12px] active:scale-[0.97] transition-transform"
                                style={{ backgroundColor: "#238636", color: "#ffffff" }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2ea043"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#238636"; }}
                            >
                                Get started free <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── MAIN SITEMAP (7 columns) ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 mb-10 md:mb-14">
                    <FooterColumn title="Platform" links={PLATFORM} open={!!openGroups.platform} onToggle={() => toggle("platform")} />
                    <FooterColumn title="Learning" links={LEARNING} open={!!openGroups.learning} onToggle={() => toggle("learning")} />
                    <FooterColumn title="CPD & Coins" links={CPD} open={!!openGroups.cpd} onToggle={() => toggle("cpd")} />
                    <FooterColumn title="GroupPay" links={GROUPPAY} open={!!openGroups.grouppay} onToggle={() => toggle("grouppay")} />
                    <FooterColumn title="Study Guides" links={GUIDES} open={!!openGroups.guides} onToggle={() => toggle("guides")} />
                    <FooterColumn title="My Account" links={ACCOUNT} open={!!openGroups.account} onToggle={() => toggle("account")} />
                    <FooterColumn title="Legal" links={LEGAL} open={!!openGroups.legal} onToggle={() => toggle("legal")} />
                </div>

                {/* ── REGULATORY / EXTERNAL PARTNERS ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-10 md:mb-14">
                    {[
                        {
                            title: "Nursing Council of Kenya (NCK)",
                            desc: "Official regulator for nursing licensure, CPD requirements, and professional standards in Kenya.",
                            link: "https://www.nckenya.com",
                            linkText: "Visit NCK",
                        },
                        {
                            title: "Kenya Medical Training College (KMTC)",
                            desc: "National network of nursing colleges. Our curriculum aligns with KMTC and Ministry of Health standards.",
                            link: "https://www.kmtc.ac.ke",
                            linkText: "Visit KMTC",
                        },
                        {
                            title: "NCLEX & Global Pathways",
                            desc: "Preparing to work abroad? Explore NCLEX-RN requirements and international licensing pathways.",
                            link: "https://www.ncsbn.org/nclex.htm",
                            linkText: "Visit NCSBN",
                        },
                    ].map((card, i) => (
                        <div key={i} className="p-4 rounded-2xl" style={{ backgroundColor: "#161b22" }}>
                            <h4 className="font-bold mb-1.5 text-[12px] md:text-[13px]" style={{ color: "#e6edf3" }}>
                                {card.title}
                            </h4>
                            <p className="text-[11px] leading-relaxed mb-3" style={{ color: "#8b949e" }}>
                                {card.desc}
                            </p>
                            <a href={card.link} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] font-bold inline-flex items-center gap-1 hover:gap-2 transition-all"
                                style={{ color: "#e6edf3" }}>
                                {card.linkText} <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    ))}
                </div>

                {/* ── CONTACT + LEGAL + COPYRIGHT ── */}
                <div className="pt-6 md:pt-8" style={{ borderTop: "1px solid #21262d" }}>

                    {/* Contact row */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
                        <div className="flex items-center gap-2 text-[11px] md:text-[12px] flex-wrap" style={{ color: "#8b949e" }}>
                            <Mail className="w-3.5 h-3.5" />
                            <a href="mailto:medraenursing@gmail.com"
                                className="font-medium hover:underline"
                                style={{ color: "#e6edf3" }}>
                                medraenursing@gmail.com
                            </a>
                            <span style={{ color: "#30363d" }}>·</span>
                            <Phone className="w-3.5 h-3.5" />
                            <a href="tel:0717517371" className="font-medium hover:underline" style={{ color: "#e6edf3" }}>
                                0717 517 371
                            </a>
                            <span style={{ color: "#30363d" }}>·</span>
                            <a href="https://wa.me/254704473503" target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-bold hover:underline"
                                style={{ color: "#3fb950" }}>
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp 0704 473 503
                            </a>
                        </div>
                        <div className="md:ml-auto flex items-center gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: "#8b949e" }}>
                            <Shield className="w-3.5 h-3.5" />
                            <span>Data protected · Kenya DPA 2019 compliant</span>
                        </div>
                    </div>

                    {/* Legal agreement notice */}
                    <div className="rounded-xl p-3 mb-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                        style={{ backgroundColor: "#161b22" }}>
                        <div className="flex items-start sm:items-center gap-2 flex-1">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" style={{ color: "#3fb950" }} />
                            <p className="text-[10px] md:text-[11px]" style={{ color: "#8b949e" }}>
                                By using Medrae you agree to our{" "}
                                <button onClick={() => navigate("/terms")} className="font-bold hover:underline" style={{ color: "#e6edf3" }}>Terms</button>
                                {", "}
                                <button onClick={() => navigate("/privacy")} className="font-bold hover:underline" style={{ color: "#e6edf3" }}>Privacy Policy</button>
                                {", and "}
                                <button onClick={() => navigate("/cookies")} className="font-bold hover:underline" style={{ color: "#e6edf3" }}>Cookie Policy</button>.
                            </p>
                        </div>
                        <p className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold shrink-0"
                            style={{ color: "#6e7681" }}>
                            Continued use = acceptance
                        </p>
                    </div>

                    {/* Copyright + final line */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px] md:text-[11px]"
                        style={{ color: "#8b949e" }}>
                        <p>© {currentYear} Medrae Kenya · All rights reserved · Made for nurses, by nurses.</p>
                        <p className="font-bold uppercase tracking-[0.2em] text-center md:text-right"
                            style={{ color: "#6e7681" }}>
                            Learn · Practice · Advance
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}