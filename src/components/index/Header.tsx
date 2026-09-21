// src/components/index/Header.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Menu, X, ArrowRight, ChevronDown, MoreHorizontal,
    Home, Sparkles, Users, Trophy, Stethoscope, BookOpen,
    Brain, Info, Mail, FileText, HelpCircle, ClipboardList,
    GraduationCap, Award, LogIn, UserPlus, Headphones, Mic2,
} from 'lucide-react';

interface HeaderProps {
    onNavigate?: (sectionId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('home');
    const [isHovering, setIsHovering] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);
    const [colorIndex, setColorIndex] = useState(0);
    const [isSeoOpen, setIsSeoOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    // Rainbow color cycling
    useEffect(() => {
        const interval = setInterval(() => {
            setColorIndex((prev) => (prev + 1) % 12);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleInteraction = () => {
            setIsInteracting(true);
            setTimeout(() => setIsInteracting(false), 2000);
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('scroll', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('scroll', handleInteraction);
        };
    }, []);

    const scrollToSection = (sectionId: string) => {
        setIsMobileMenuOpen(false);
        setIsSeoOpen(false);
        setIsMoreOpen(false);
        setActiveSection(sectionId);
        setIsInteracting(true);
        setTimeout(() => setIsInteracting(false), 2000);

        if (sectionId === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
                const homeElement = document.getElementById('home');
                if (homeElement) {
                    homeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            setTimeout(() => {
                if (window.pageYOffset > 10) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 400);
            return;
        }

        const element = document.getElementById(sectionId);
        if (element) {
            const headerOffset = 60;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            setTimeout(() => {
                const currentScroll = window.pageYOffset;
                if (Math.abs(currentScroll - offsetPosition) > 100) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 300);
        }

        if (onNavigate) {
            onNavigate(sectionId);
        }
    };

    // Primary tabs
    const primaryNavItems = [
        { id: 'home', label: 'Home', icon: Home, bg: 'bg-[#1f6feb]' },
        { id: 'features', label: 'Features', icon: Sparkles, bg: 'bg-[#8957e5]' },
        { id: 'podcasts', label: 'Podcasts', icon: Headphones, bg: 'bg-[#f85149]' }, // ← NEW
        { id: 'grouppay', label: 'GroupPay', icon: Users, bg: 'bg-[#3fb950]' },
        { id: 'merit-cup', label: 'Merit Cup', icon: Trophy, bg: 'bg-[#d29922]' },
    ];

    // Secondary tabs
    const moreNavItems = [
        { id: 'clinical-assessment', label: 'Clinical Assessment', icon: Stethoscope, bg: 'bg-[#f85149]' },
        { id: 'curriculum', label: 'Curriculum', icon: BookOpen, bg: 'bg-[#1f6feb]' },
        { id: 'algorithm', label: 'AI Algorithm', icon: Brain, bg: 'bg-[#8957e5]' },
        { id: 'about', label: 'About', icon: Info, bg: 'bg-[#3fb950]' },
        { id: 'contact', label: 'Contact', icon: Mail, bg: 'bg-[#d29922]' },
    ];

    // Full list for mobile menu
    const allNavItems = [...primaryNavItems, ...moreNavItems];

    // SEO pages — icon + color per page
    const seoPages = [
        { to: '/nursing-revision-kenya', label: 'Nursing Revision in Kenya', icon: GraduationCap, bg: 'bg-[#1f6feb]' },
        { to: '/nck-exam-revision', label: 'NCK Exam Revision', icon: FileText, bg: 'bg-[#8957e5]' },
        { to: '/nck-exam-questions', label: 'NCK Exam Questions', icon: HelpCircle, bg: 'bg-[#3fb950]' },
        { to: '/nck-past-papers', label: 'NCK Past Papers', icon: ClipboardList, bg: 'bg-[#d29922]' },
        { to: '/nck-exam-preparation', label: 'NCK Exam Preparation', icon: Award, bg: 'bg-[#f85149]' },
        { to: '/krchn-revision', label: 'KRCHN Revision', icon: BookOpen, bg: 'bg-[#1f6feb]' },
        { to: '/medrae-nursing-merit-cup', label: 'Medrae Merit Cup', icon: Trophy, bg: 'bg-[#8957e5]' },
    ];

    const rainbowColors = [
        'from-red-500 via-orange-500 to-yellow-500',
        'from-orange-500 via-yellow-500 to-green-500',
        'from-yellow-500 via-green-500 to-blue-500',
        'from-green-500 via-blue-500 to-indigo-500',
        'from-blue-500 via-indigo-500 to-purple-500',
        'from-indigo-500 via-purple-500 to-pink-500',
        'from-purple-500 via-pink-500 to-red-500',
        'from-pink-500 via-red-500 to-orange-500',
        'from-red-400 via-yellow-400 to-green-400',
        'from-green-400 via-blue-400 to-purple-400',
        'from-purple-400 via-red-400 to-yellow-400',
        'from-blue-400 via-purple-400 to-pink-400',
    ];

    const dotColors = [
        'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400',
        'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400',
        'bg-red-300', 'bg-yellow-300', 'bg-green-300', 'bg-blue-300',
    ];

    const getGlowColor = () => {
        if (isInteracting) {
            return 'from-red-500 via-yellow-500 to-green-500 via-blue-500 to-purple-500';
        }
        if (isScrolled) {
            return rainbowColors[colorIndex % rainbowColors.length];
        }
        if (isHovering) {
            return 'from-red-400 via-yellow-400 to-green-400 via-blue-400 to-purple-400';
        }
        return rainbowColors[colorIndex % rainbowColors.length];
    };

    const getGlowWidth = () => {
        if (isInteracting) return 'w-[150%]';
        if (isScrolled) return 'w-[110%]';
        return 'w-[100%]';
    };

    const getGlowAnimation = () => {
        if (isInteracting) return 'animate-glow-pulse-fast';
        if (isScrolled || isHovering) return 'animate-glow-pulse-strong';
        return 'animate-glow-pulse';
    };

    const getDotColor = (index: number) => {
        const colors = dotColors;
        return colors[index % colors.length];
    };

    return (
        <>
            {/* Desktop Header */}
            <header
                className={`fixed top-0 left-0 right-0 z-[999] hidden md:block transition-all duration-300 ${!isScrolled
                    ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-100/50'
                    : 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-slate-200/50'
                    }`}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-12 lg:h-14">
                        {/* Logo */}
                        <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => scrollToSection('home')}
                        >
                            <img
                                src="/pwa-192x192.jpeg"
                                alt="Medrae Logo"
                                className="h-6 w-6 lg:h-8 lg:w-8 rounded-lg shadow-md group-hover:scale-110 transition-transform"
                            />
                            <div>
                                <span className="text-base lg:text-lg font-black text-red-600">MEDRAE</span>
                                <span className="text-base lg:text-lg font-black text-slate-800 ml-1">NURSING</span>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex items-center gap-0.5 lg:gap-1">
                            {primaryNavItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`px-2 lg:px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 relative group ${activeSection === item.id
                                        ? 'text-blue-600 bg-blue-50'
                                        : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                                        }`}
                                >
                                    {item.label}
                                    {activeSection === item.id && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-blue-600 rounded-full" />
                                    )}
                                </button>
                            ))}

                            {/* More dropdown */}
                            <div
                                className="relative"
                                onMouseEnter={() => setIsMoreOpen(true)}
                                onMouseLeave={() => setIsMoreOpen(false)}
                            >
                                <button
                                    className={`px-2 lg:px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1 ${isMoreOpen
                                        ? 'text-blue-600 bg-blue-50'
                                        : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                                        }`}
                                >
                                    More
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isMoreOpen && (
                                    <div className="absolute top-full right-0 pt-1 w-56">
                                        <div className="rounded-xl bg-white shadow-xl border border-slate-200/60 overflow-hidden">
                                            {moreNavItems.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => scrollToSection(item.id)}
                                                    className="block w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-100 last:border-b-0"
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SEO dropdown */}
                            <div
                                className="relative"
                                onMouseEnter={() => setIsSeoOpen(true)}
                                onMouseLeave={() => setIsSeoOpen(false)}
                            >
                                <button
                                    className={`px-2 lg:px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-1 ${isSeoOpen
                                        ? 'text-blue-600 bg-blue-50'
                                        : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                                        }`}
                                >
                                    Guides
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSeoOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isSeoOpen && (
                                    <div className="absolute top-full right-0 pt-1 w-64">
                                        <div className="rounded-xl bg-white shadow-xl border border-slate-200/60 overflow-hidden">
                                            {seoPages.map((page) => (
                                                <Link
                                                    key={page.to}
                                                    to={page.to}
                                                    onClick={() => setIsSeoOpen(false)}
                                                    className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-slate-100 last:border-b-0"
                                                >
                                                    {page.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </nav>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-1.5">
                            <button
                                className="text-sm font-medium transition-colors px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                onClick={() => navigate('/login')}
                            >
                                Sign In
                            </button>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-lg transition-colors text-sm inline-flex items-center"
                                onClick={() => navigate('/register')}
                            >
                                Get Started
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* LED snake + dots */}
                <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getGlowColor()} ${getGlowAnimation()} ${getGlowWidth()} relative`}
                        style={{
                            boxShadow: `
                                0 0 20px rgba(255, 0, 0, 0.4),
                                0 0 40px rgba(255, 165, 0, 0.3),
                                0 0 60px rgba(255, 255, 0, 0.2),
                                0 0 80px rgba(0, 255, 0, 0.2),
                                0 0 100px rgba(0, 0, 255, 0.2),
                                0 0 120px rgba(128, 0, 255, 0.2),
                                0 0 140px rgba(255, 0, 255, 0.2)
                            `
                        }}
                    />
                </div>

                <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
                    <div className="flex justify-between items-center h-full px-1">
                        {[...Array(40)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-1 h-1 rounded-full transition-all duration-300 ${isInteracting
                                    ? `${getDotColor(i + colorIndex)} animate-led-dot-fast`
                                    : isScrolled || isHovering
                                        ? `${getDotColor(i + colorIndex)}/70 animate-led-dot`
                                        : `${getDotColor(i + colorIndex)}/40`
                                    }`}
                                style={{
                                    animationDelay: `${i * 0.04}s`,
                                    boxShadow: isInteracting
                                        ? `0 0 12px ${getDotColor(i + colorIndex).replace('bg-', '')}800, 0 0 24px ${getDotColor(i + colorIndex).replace('bg-', '')}400`
                                        : isScrolled || isHovering
                                            ? `0 0 6px ${getDotColor(i + colorIndex).replace('bg-', '')}600`
                                            : `0 0 3px ${getDotColor(i + colorIndex).replace('bg-', '')}300`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </header>

            {/* ============================================================ */}
            {/* Mobile Header — WhatsApp-sized */}
            {/* ============================================================ */}
            <header
                className={`fixed top-0 left-0 right-0 z-[9999] md:hidden transition-all duration-300 ${!isScrolled
                    ? 'bg-white shadow-md'
                    : 'bg-white shadow-lg'
                    }`}
            >
                <div className="px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div
                            className="flex items-center gap-2.5 cursor-pointer"
                            onClick={() => scrollToSection('home')}
                        >
                            <img
                                src="/pwa-192x192.jpeg"
                                alt="Medrae Logo"
                                className="h-9 w-9 rounded-xl"
                            />
                            <span className="text-base font-black">
                                <span className="text-red-600">MEDRAE</span>
                                <span className="text-slate-800 ml-1">NURSING</span>
                            </span>
                        </div>

                        {/* Menu toggle — 44px tap target */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                            className="p-2.5 rounded-xl transition-all text-slate-700 active:bg-slate-100"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu — opaque, no transparency */}
                <div
                    className={`absolute top-16 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl transition-all duration-300 overflow-hidden ${isMobileMenuOpen
                        ? 'max-h-[calc(100vh-64px)] opacity-100'
                        : 'max-h-0 opacity-0'
                        }`}
                >
                    <div className="p-4 space-y-4 max-h-[calc(100vh-64px)] overflow-y-auto">

                        {/* Section links */}
                        <div className="space-y-1.5">
                            {allNavItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => scrollToSection(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeSection === item.id
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-700 active:bg-slate-100'
                                            }`}
                                    >
                                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg}`}>
                                            <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                                        </span>
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Revision Guides */}
                        <div className="pt-4 border-t border-slate-200">
                            <p className="px-1 pb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                Revision Guides
                            </p>
                            <div className="space-y-1.5">
                                {seoPages.map((page) => {
                                    const Icon = page.icon;
                                    return (
                                        <Link
                                            key={page.to}
                                            to={page.to}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-700 active:bg-slate-100 transition-all"
                                        >
                                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${page.bg}`}>
                                                <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                                            </span>
                                            <span>{page.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Auth buttons */}
                        <div className="pt-4 border-t border-slate-200 space-y-2">
                            <button
                                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    navigate('/login');
                                }}
                            >

                                Sign In
                            </button>
                            <button
                                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-colors text-sm"
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    navigate('/register');
                                }}
                            >
                                <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-white" strokeWidth={2.2} />
                                </span>
                                Get Started
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile LED snake */}
                <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${getGlowColor()} ${getGlowAnimation()} ${getGlowWidth()} relative`}
                        style={{
                            boxShadow: `
                                0 0 20px rgba(255, 0, 0, 0.4),
                                0 0 40px rgba(255, 165, 0, 0.3),
                                0 0 60px rgba(255, 255, 0, 0.2),
                                0 0 80px rgba(0, 255, 0, 0.2),
                                0 0 100px rgba(0, 0, 255, 0.2),
                                0 0 120px rgba(128, 0, 255, 0.2),
                                0 0 140px rgba(255, 0, 255, 0.2)
                            `
                        }}
                    />
                </div>
            </header>

            {/* Spacer */}
            <div className="h-16 md:h-14 lg:h-16" />
        </>
    );
};

export default Header;