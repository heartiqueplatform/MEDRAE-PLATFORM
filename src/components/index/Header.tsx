// src/components/index/Header.tsx - Fixed Sticky Header with GroupPay

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';

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

    // 🔥 UPDATED: Navigation items with GroupPay added
    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'features', label: 'Features' },
        { id: 'clinical-assessment', label: 'Clinical Assessment' },
        { id: 'grouppay', label: 'GroupPay' }, // 🆕 Added GroupPay
        { id: 'curriculum', label: 'Curriculum' },
        { id: 'algorithm', label: 'AI Algorithm' },
        { id: 'about', label: 'About' },
        { id: 'contact', label: 'Contact' },
    ];

    // Full rainbow color palette
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
            {/* Desktop Header - ALWAYS STICKY */}
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
                            {navItems.map((item) => (
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
                        </nav>

                        {/* Auth Buttons */}
                        <div className="flex items-center gap-1.5">
                            <button
                                className="text-sm font-medium transition-all px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50/50"
                                onClick={() => navigate('/login')}
                            >
                                Sign In
                            </button>
                            <button
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-blue-200/50 hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm"
                                onClick={() => navigate('/register')}
                            >
                                Get Started
                                <ArrowRight className="w-3 h-3 ml-1 inline" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* GLOWING LED SNAKE BORDER */}
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

                {/* LED Dots */}
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

            {/* Mobile Header - ALWAYS STICKY */}
            <header
                className={`fixed top-0 left-0 right-0 z-[9999] md:hidden transition-all duration-300 ${!isScrolled
                    ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-100/50'
                    : 'bg-white/90 backdrop-blur-xl shadow-lg border-b border-slate-200/50'
                    }`}
            >
                <div className="px-3">
                    <div className="flex items-center justify-between h-12">
                        <div
                            className="flex items-center gap-1.5 cursor-pointer"
                            onClick={() => scrollToSection('home')}
                        >
                            <img
                                src="/pwa-192x192.jpeg"
                                alt="Medrae Logo"
                                className="h-6 w-6 rounded-lg"
                            />
                            <span className="text-xs font-black">
                                <span className="text-red-600">MEDRAE</span>
                                <span className="text-slate-800 ml-0.5">NURSING</span>
                            </span>
                        </div>

                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-1.5 rounded-lg transition-all text-slate-600 hover:bg-slate-100"
                        >
                            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div
                    className={`absolute top-12 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-xl transition-all duration-300 overflow-hidden ${isMobileMenuOpen
                        ? 'max-h-[calc(100vh-48px)] opacity-100'
                        : 'max-h-0 opacity-0'
                        }`}
                >
                    <div className="p-3 space-y-0.5">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeSection === item.id
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}

                        <div className="pt-3 border-t border-slate-100 space-y-1.5">
                            <button
                                className="w-full text-center px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all border border-slate-200"
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    navigate('/login');
                                }}
                            >
                                Sign In
                            </button>
                            <button
                                className="w-full text-center px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold transition-all shadow-lg shadow-blue-200/50 text-xs"
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    navigate('/register');
                                }}
                            >
                                Get Started
                                <ArrowRight className="w-3 h-3 ml-1.5 inline" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile LED Snake */}
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

            {/* Spacer - IMPORTANT: This pushes content below the fixed header */}
            <div className="h-10 md:h-14 lg:h-16" />
        </>
    );
};

export default Header;