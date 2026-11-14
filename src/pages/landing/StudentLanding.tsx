// src/pages/landing/StudentLanding.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play, MessageSquare,
    LogOut, Volume, VolumeX, GraduationCap, CheckCircle2, Eye, Target,
    Gauge, TrendingUp, AlertTriangle, Trophy, BookOpen, Sparkles, Award,
    BarChart3, Shield, FileQuestion, Timer, Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { supabase } from "@/lib/supabaseClient";
import { authManager } from "@/lib/authManager";
import HeroMobileCard from "@/components/HeroMobileCard";

import KRCHNCurriculum from '@/components/index/KRCHNCurriculum';

import ClinicalAssessmentSection from '@/components/index/ClinicalAssessmentSection';
import GroupPayLandingSection from '@/components/grouppay/GroupPayLandingSection';
import NursingMeritCupSection from '@/components/index/NursingMeritCupSection';
import PodcastShowcaseSection from '@/components/index/PodcastShowcaseSection';
// 🆕 New pieces
// 🆕 New pieces
import {
    StudentTopNav,
    StudentSidebarDrawer,
    StudentSidebarMobileTrigger,
} from '@/components/index/StudentSidebar';
import SiteFooter from '@/components/index/SiteFooter';
import { FloatingWhatsApp } from '@/components/index/FloatingWhatsApp';
import { StudentCoinsSection } from '@/components/index/StudentCoinsSection';

declare global {
    interface Window {
        __studifyOpen?: (screen?: 'player' | 'episodes' | 'admin') => void;
    }
}

/* ============================================================
   ANIMATION UTILITIES
   ============================================================ */
const useIntersectionObserver = (options = {}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px', ...options });

        if (ref.current) observer.observe(ref.current);
        return () => { if (ref.current) observer.unobserve(ref.current); };
    }, [options]);

    return [ref, isVisible];
};

const useCountUp = (target: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    const [ref, isVisible] = useIntersectionObserver();

    useEffect(() => {
        if (!isVisible) return;
        let startTime: number;
        let animationFrame: number;
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isVisible, target, duration]);

    return [ref, count];
};

const HeroSkeleton = () => (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm animate-pulse">
        <div className="w-full h-[70%] bg-white/20" />
        <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-white/30 rounded" />
            <div className="h-4 w-1/2 bg-white/20 rounded" />
        </div>
    </div>
);

const AnimatedSection = ({ children, className = "", delay = 0, direction = "up" }: any) => {
    const [ref, isVisible] = useIntersectionObserver();
    const getTransform = () => {
        switch (direction) {
            case 'up': return 'translateY(60px)';
            case 'down': return 'translateY(-60px)';
            case 'left': return 'translateX(-60px)';
            case 'right': return 'translateX(60px)';
            default: return 'translateY(60px)';
        }
    };
    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0'}`}
            style={{ transform: isVisible ? 'translateY(0)' : getTransform(), transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const AnimatedCard = ({ children, index }: { children: React.ReactNode; index: number }) => {
    const [ref, isVisible] = useIntersectionObserver();
    const delay = index * 50;
    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

/* ============================================================
   MAIN
   ============================================================ */
export default function StudentLanding() {
    const [heroMediaLoaded, setHeroMediaLoaded] = useState<Record<number, boolean>>({});
    const [activeHeroStory, setActiveHeroStory] = useState(0);
    const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showExitOverlay, setShowExitOverlay] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);          // 🆕 mobile drawer state
    const navigate = useNavigate();

    // Hide the page scrollbar while this page is mounted
    useEffect(() => {
        const style = document.createElement("style");
        style.id = "hide-scrollbar-student-landing";
        style.textContent = `
            html::-webkit-scrollbar,
            body::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
            html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        `;
        document.head.appendChild(style);
        return () => {
            document.getElementById("hide-scrollbar-student-landing")?.remove();
        };
    }, []);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const autoPlayInterval = useRef<NodeJS.Timeout | null>(null);

    const [statsRef, statsVisible] = useIntersectionObserver();
    const [studentCount, setStudentCount] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);
    const [successRate, setSuccessRate] = useState(0);

    useEffect(() => { (window as any).hideMedraeLoader?.(); }, []);

    // Stat counter animations
    useEffect(() => {
        if (!statsVisible) return;
        const run = (end: number, dur: number, setter: (n: number) => void) => {
            const startTime = performance.now();
            const step = (timestamp: number) => {
                const progress = Math.min((timestamp - startTime) / dur, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                setter(Math.floor(eased * end));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        run(2231, 2500, setStudentCount);
        run(15400, 2000, setQuestionCount);
        run(78, 1800, setSuccessRate);
    }, [statsVisible]);

    // Auto-play carousel
    useEffect(() => {
        if (isAutoPlaying && !isMobile) {
            autoPlayInterval.current = setInterval(() => {
                setActiveHeroStory(prev => (prev + 1) % heroStorySlides.length);
            }, 2000);
        }
        return () => { if (autoPlayInterval.current) clearInterval(autoPlayInterval.current); };
    }, [isAutoPlaying, isMobile]);

    const handleCarouselHover = useCallback((isHovering: boolean) => {
        setIsAutoPlaying(!isHovering);
    }, []);

    useEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

    // Session check → dashboard redirect
    useEffect(() => {
        let cancelled = false;
        const cachedUser = authManager.getUser();
        if (cachedUser) { navigate("/redirect", { replace: true }); return; }
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (cancelled) return;
                if (session?.user) { navigate("/redirect", { replace: true }); return; }
                if (authManager.getUser()) navigate("/redirect", { replace: true });
            })
            .catch((err) => {
                if (cancelled) return;
                console.warn("[StudentLanding] session check failed:", err);
                if (authManager.getUser()) navigate("/redirect", { replace: true });
            });
        return () => { cancelled = true; };
    }, [navigate]);

    // Keyboard nav for carousel
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
            else if (e.key === "ArrowLeft") setActiveHeroStory(prev => Math.max(prev - 1, 0));
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    const heroStorySlides = [
        {
            bg: "/indexbackground2.jpg",
            text: (
                <div className="w-full h-full flex items-end justify-center text-center pb-3 md:pb-12 lg:pb-16">
                    <div className="px-3 py-1 rounded-lg bg-white/5 backdrop-blur-none shadow-sm">
                        <div className="flex items-center justify-center gap-2 mb-2 md:mb-2">
                            <img src="/pwa-192x192.jpeg" alt="Medrae Logo" className="h-12 w-12 md:h-16 md:w-16 rounded-sm object-contain" />
                        </div>
                        <h1 className="text-center text-4xl tracking-wide">
                            <span style={{ color: "#e90000" }}>MEDRAE</span>
                            <span className="ml-2" style={{ color: "#ffffff" }}>NURSING</span>
                        </h1>
                    </div>
                </div>
            ),
        },
        {
            bg: "/indexbackground3.jpg",
            text: (
                <h2 className="text-sm md:text-xl font-semibold leading-snug text-gray-900 md:text-white">
                    Medrae is built for serious NCK, FQEs and nursing exam preparation across all cadres (DCHN, BSN, KRN). Practice 6,500+ updated exam-style questions, get instant explanations after every answer, and focus directly on your weakest and most tested units.
                </h2>
            ),
        },
        {
            bg: "/indexbackground6.jpg",
            text: (
                <div className="flex flex-col gap-2 items-center">
                    <Button size="lg" className="bg-blue-500 text-white font-bold text-lg md:text-2xl px-8 py-3 rounded-3xl shadow-lg transition-all duration-300 md:hover:bg-blue-600 md:hover:scale-105" onClick={() => navigate('/register')}>
                        Create Account
                    </Button>
                    <Button size="lg" variant="outline" className="border-yellow-500 text-blue-500 font-bold text-base md:text-lg px-8 py-3 rounded-3xl shadow-lg transition-all duration-300 md:hover:bg-blue-500 md:hover:text-white md:hover:scale-105" onClick={() => navigate('/login')}>
                        Sign In to Continue
                    </Button>
                </div>
            ),
        },
        {
            bg: "/background03.jpg",
            text: (
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 md:text-white">
                    Kenya's Structured NCK, FQEs & Nursing Exam Practice Platform
                </h2>
            ),
        },
        {
            bg: "/indexbackground5.jpg",
            text: (
                <h2 className="text-sm md:text-xl font-semibold leading-snug text-gray-900 md:text-white">
                    <p className="font-semibold text-2xl text-white">For Tutors & Institutions</p>
                    <p>Medrae also offers affordable institutional online exam hosting with a powerful DigiProctor system. Tutors can upload revision questions, CATs, assignments, mock exams, and internal assessments all fully digitized and automatically tracked.</p>
                    <p>Save time on marking, go fully digital, and train your students to confidently sit any computer-based exam including NCK without fear.</p>
                </h2>
            ),
        },
        {
            bg: "/background02.jpg",
            text: (
                <h2 className="text-sm md:text-xl font-semibold leading-snug text-gray-900 md:text-white">
                    Train in DigiProctor-style exam mode with timed practice, unit-based revision, and automatic tracking of every question you fail. Review smarter. Practice faster. Improve strategically.
                </h2>
            ),
        },
        {
            bg: "/background06.jpg",
            text: (
                <h2 className="text-sm md:text-xl font-semibold leading-snug text-gray-900 md:text-white">
                    Access the full nursing revision system—structured units, instant explanations, weak-topic tracking, and a growing bank of 6,500+ questions updated regularly to match exam trends across all nursing cadres.
                </h2>
            ),
        },
    ];

    // Lazy media preload
    useEffect(() => {
        if (!heroStorySlides?.length) return;
        const firstImg = new Image();
        firstImg.src = heroStorySlides[0].bg;
        firstImg.onload = () => setHeroMediaLoaded(prev => ({ ...prev, 0: true }));
        firstImg.onerror = () => setHeroMediaLoaded(prev => ({ ...prev, 0: true }));

        const idle = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 2000));
        idle(() => {
            heroStorySlides.slice(1).forEach((slide, i) => {
                const idx = i + 1;
                const img = new Image();
                img.src = slide.bg;
                img.onload = () => setHeroMediaLoaded(prev => ({ ...prev, [idx]: true }));
                img.onerror = () => setHeroMediaLoaded(prev => ({ ...prev, [idx]: true }));
            });
            const audio = new Audio("/sounds/notification.mp3");
            audio.preload = "auto";
        });
    }, []);

    const [spring, api] = useSpring(() => ({ x: 0 }));
    const bind = useDrag(
        ({ down, movement: [mx], event }) => {
            if (event?.type?.startsWith("touch") || event?.type?.startsWith("pointer")) event.preventDefault();
            api.start({ x: mx });
            if (!down) {
                if (mx < -100) setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
                else if (mx > 100) setActiveHeroStory(prev => Math.max(prev - 1, 0));
                api.start({ x: 0 });
            }
        },
        { axis: "x", filterTaps: true, pointer: { touch: true, mouse: true }, passive: false }
    );

    useEffect(() => {
        let scrolling = false;
        const handleWheel = (e: WheelEvent) => {
            if (scrolling) return;
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
                if (e.deltaX > 0) setActiveHeroStory(prev => Math.max(prev - 1, 0));
                else setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
                scrolling = true;
                setTimeout(() => { scrolling = false; }, 250);
            }
        };
        window.addEventListener("wheel", handleWheel, { passive: false });
        return () => window.removeEventListener("wheel", handleWheel);
    }, []);

    const features = [
        { icon: Brain, title: "Instant Answer Explanations", description: "Tap any answer and immediately see why it's correct or wrong with detailed rationales. No guessing. No searching through textbooks. Understand the 'why' behind every answer and lock in the knowledge instantly. Each explanation includes key concepts, nursing interventions, and exam tips to reinforce your learning.", category: "Core" },
        { icon: Users, title: "Unit-Based Smart Revision", description: "Jump directly to your weakest or most tested nursing units. Focus your study time where it matters most. Our smart revision system identifies which nursing units appear most frequently in exams and prioritizes them in your practice sessions. Eliminate blind revision and study with surgical precision.", category: "Core" },
        { icon: Star, title: "Failed Question Tracker", description: "Every question you get wrong is automatically saved to your personal 'Mistakes Log.' Revisit, review, and retrain until you master the concept. Our system identifies patterns in your mistakes and creates targeted practice sessions to convert your weaknesses into guaranteed marks. Stop making the same mistakes twice.", category: "Core" },
        { icon: Play, title: "6,500+ NCK-Style Questions", description: "Practice from a constantly growing question bank of 6,500+ updated NCK-style questions designed around real exam patterns. Each question is vetted by nursing educators and aligned with the latest NCK curriculum. Train with exam-relevant content—not outdated material. New questions added weekly to keep you ahead.", category: "Core" },
        { icon: Shield, title: "DigiProctor Exam Simulation", description: "Experience the full NCK exam experience with our DigiProctor-style practice mode. Timed sessions with 75 questions in 60 minutes, real exam interface with question navigation and flagging, pressure testing with progressively challenging questions, and instant performance analysis with unit-by-unit breakdown. Train like it's the actual exam day and eliminate exam anxiety.", category: "Core", isHighlighted: true },
        { icon: GraduationCap, title: "For Tutors & Institutions", description: "Affordable institutional online exam hosting powered by our secure DigiProctor system. Upload revision questions, CATs, assignments, mock exams, and internal assessments — all fully digitized and automatically tracked. Save hours on marking, go fully digital, and train your students to confidently sit any computer-based exam including NCK without fear. Results released within 12 hours with one click.", category: "Core" },
        {
            icon: Sparkles,
            title: "And So Much More...",
            description: "Medrae is a complete nursing ecosystem with AI-powered performance prediction, daily emotional check-ins for mental wellness, community support from 2,231+ nursing students, MedTube with 3,000+ curated nursing videos, hospital placement board for clinical rotations, NursMartt marketplace for secondhand nursing items, survival hub for exam center connections, and powerful study tools to track your progress.",
            category: "More",
            isMoreCard: true,
            moreItems: [
                { icon: Gauge, label: "AI Performance Prediction - 95% Accuracy" },
                { icon: Heart, label: "Daily Emotional Check-in & Wellness" },
                { icon: Users, label: "Community Support & Anonymous Posting" },
                { icon: BookOpen, label: "MedTube - 3,000+ Curated Videos" },
                { icon: Eye, label: "Hospital Placement Board" },
                { icon: MessageSquare, label: "NursMartt - Secondhand Marketplace" },
                { icon: CheckCircle2, label: "Survival Hub - Exam Center Connect" },
                { icon: BarChart3, label: "Study Progress Dashboard" },
                { icon: FileQuestion, label: "My Mistakes - Error Log" },
                { icon: TrendingUp, label: "Personalized Study Recommendations" },
                { icon: Award, label: "Streak Tracking & Motivation" },
                { icon: Timer, label: "NCK Mock Exams - Full Length" },
                { icon: Target, label: "Weakness Detection & Strength Recognition" },
                { icon: Layers, label: "Difficulty Progression - Basic to Advanced" },
            ]
        }
    ];


    return (
        <div className="min-h-screen w-full overflow-x-hidden relative bg-slate-50">
            {/* Desktop: top nav. Mobile: trigger → drawer */}
            <StudentTopNav />
            <StudentSidebarMobileTrigger onOpen={() => setDrawerOpen(true)} />
            <StudentSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            {/* Spacer for the fixed 64px top bar (desktop only) */}
            <div className="hidden lg:block h-16" aria-hidden />

            <div className="w-full">
                {/* ═══════════════ HERO ═══════════════ */}
                {/* ═══════════════ HERO — ALTERNATING TWO-COLUMN ═══════════════ */}
                <section
                    id="home"
                    className="relative w-full bg-slate-50
             pt-10 md:pt-16 lg:pt-20
             pb-14 md:pb-20
             px-4 md:px-6"
                >
                    <div className="max-w-6xl mx-auto space-y-14 md:space-y-20 lg:space-y-28">

                        {/* ═══════════════════════════════════════════════════
        ROW 1 — TEXT LEFT, IMAGE RIGHT
        Purpose: establish what this is
       ═══════════════════════════════════════════════════ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">

                            {/* Text column */}
                            <div className="order-1">
                                <p className="text-[12px] md:text-[13px] font-semibold
                      uppercase tracking-[0.15em] text-blue-600 mb-4 md:mb-5">
                                    Nursing exam preparation, done properly
                                </p>

                                <h1 className="text-slate-900 font-bold tracking-[-0.02em] leading-[1.05]
                       text-[32px] sm:text-[42px] md:text-[48px] lg:text-[54px]">
                                    Pass your NCK, FQEs<br />
                                    and nursing exams.<br />
                                    <span className="text-blue-600">With clarity, not chaos.</span>
                                </h1>

                                <p className="mt-6 text-slate-700 leading-relaxed text-[15px] md:text-[17px]">
                                    10,500+ exam-style questions organized the way the NCK actually tests you
                                    — by unit, by condition, by difficulty. Every answer comes with an
                                    explanation. Every mistake gets tracked. Every weak unit gets surfaced
                                    before exam day, not after.
                                </p>

                                <p className="mt-4 text-slate-500 leading-relaxed text-[14px] md:text-[15px]">
                                    Built for DCHN, BSN, and KRN students across Kenya.
                                </p>

                                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => navigate("/register")}
                                        className="inline-flex items-center justify-center
                       px-6 md:px-7 py-3.5 md:py-4 rounded-lg
                       bg-slate-900 hover:bg-slate-800
                       text-white font-semibold text-[14px] md:text-[15px]
                       active:scale-[0.98] transition-all"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        Start free
                                    </button>
                                    <button
                                        onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                                        className="inline-flex items-center justify-center
                       px-6 md:px-7 py-3.5 md:py-4 rounded-lg
                       bg-transparent hover:bg-slate-100
                       border border-slate-300 hover:border-slate-400
                       text-slate-700 font-semibold text-[14px] md:text-[15px]
                       active:scale-[0.98] transition-all"
                                        style={{ touchAction: "manipulation" }}
                                    >
                                        See what's inside
                                    </button>
                                </div>

                                <p className="mt-5 text-[13px] text-slate-500">
                                    Free to start. No credit card required. Cancel anytime.
                                </p>
                            </div>

                            {/* Image column */}
                            <div className="order-2 relative w-full
                      h-[280px] sm:h-[340px] md:h-[420px] lg:h-[480px]
                      overflow-hidden rounded-2xl
                      ring-1 ring-slate-900/5">
                                {['/high6.png', '/indexbackground2.jpg', '/high3.png'].map((img, index) => (
                                    <div
                                        key={index}
                                        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
                                        style={{ backgroundImage: `url('${img}')`, opacity: index === activeHeroStory % 3 ? 1 : 0 }}
                                    />
                                ))}

                                {/* Soft bottom gradient so dots read */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none z-0" />

                                {/* Dots */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                                    {[0, 1, 2].map((index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveHeroStory(index)}
                                            aria-label={`Go to slide ${index + 1}`}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${index === activeHeroStory % 3
                                                ? 'w-8 bg-white'
                                                : 'w-1.5 bg-white/40 hover:bg-white/60'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Mute toggle — quiet, corner */}
                                <button
                                    onClick={() => {
                                        setIsMuted(prev => {
                                            const next = !prev;
                                            if (notificationAudioRef.current) notificationAudioRef.current.muted = next;
                                            return next;
                                        });
                                    }}
                                    aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                                    className="absolute top-3 right-3 z-20
                     w-8 h-8 rounded-lg flex items-center justify-center
                     bg-black/30 backdrop-blur-sm text-white/90
                     hover:bg-black/50 active:scale-95 transition-all"
                                    style={{ touchAction: "manipulation" }}
                                >
                                    {isMuted
                                        ? <VolumeX className="w-3.5 h-3.5" strokeWidth={2.2} />
                                        : <Volume className="w-3.5 h-3.5" strokeWidth={2.2} />}
                                </button>
                            </div>
                        </div>

                        {/* ═══════════════════════════════════════════════════
        ROW 2 — IMAGE LEFT, TEXT RIGHT
        Purpose: why this is different
       ═══════════════════════════════════════════════════ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">

                            {/* Image column — but shows on right on mobile via order */}
                            <div className="order-2 lg:order-1 relative w-full
                      h-[280px] sm:h-[340px] md:h-[420px] lg:h-[480px]
                      overflow-hidden rounded-2xl
                      ring-1 ring-slate-900/5">
                                <img
                                    src="/indexbackground3.jpg"
                                    alt="Nursing student studying with Medrae"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                            </div>

                            {/* Text column */}
                            <div className="order-1 lg:order-2">
                                <p className="text-[12px] md:text-[13px] font-semibold
                      uppercase tracking-[0.15em] text-slate-400 mb-4 md:mb-5">
                                    Why it works
                                </p>

                                <h2 className="text-slate-900 font-bold tracking-[-0.02em] leading-[1.1]
                       text-[26px] md:text-[34px] lg:text-[40px]">
                                    It's not just a question bank.
                                </h2>

                                <p className="mt-5 text-slate-700 leading-relaxed text-[15px] md:text-[16px]">
                                    Every question is tied to the unit it tests, the condition it belongs to,
                                    and the difficulty level it sits at — so you're never guessing where to
                                    start. The whole curriculum is mapped to the NCK syllabus, not scraped
                                    from old PDFs.
                                </p>

                                <p className="mt-4 text-slate-500 leading-relaxed text-[14px] md:text-[15px]">
                                    Your mistakes aren't just marked wrong — they're explained, saved to a
                                    personal log, and quietly rebuilt into your next practice session. The
                                    algorithm notices patterns the way a good tutor would. You study what
                                    you actually need, not what you already know.
                                </p>
                            </div>
                        </div>

                        {/* ═══════════════════════════════════════════════════
        ROW 3 — TEXT LEFT, IMAGE RIGHT
        Purpose: who made it / why trust it
       ═══════════════════════════════════════════════════ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">

                            {/* Text column */}
                            <div className="order-1">
                                <p className="text-[12px] md:text-[13px] font-semibold
                      uppercase tracking-[0.15em] text-slate-400 mb-4 md:mb-5">
                                    Why Medrae
                                </p>

                                <h2 className="text-slate-900 font-bold tracking-[-0.02em] leading-[1.1]
                       text-[26px] md:text-[34px] lg:text-[40px]">
                                    Built with nurses,<br />
                                    <span className="text-blue-600">not around them.</span>
                                </h2>

                                <p className="mt-5 text-slate-700 leading-relaxed text-[15px] md:text-[16px]">
                                    Medrae was built by a team that has sat the NCK, taught at KMTC, and
                                    watched friends fail exams they were prepared for. The platform is the
                                    answer to that gap — the structure, the pacing, and the pressure-testing
                                    that nursing school doesn't always give you.
                                </p>

                                <p className="mt-4 text-slate-500 leading-relaxed text-[14px] md:text-[15px]">
                                    No shortcuts. No scraped PDFs. No "AI magic" that can't explain itself.
                                    Just a clean, honest system built for the way nurses actually study.
                                </p>
                            </div>

                            {/* Image column */}
                            <div className="order-2 relative w-full
                      h-[280px] sm:h-[340px] md:h-[420px] lg:h-[480px]
                      overflow-hidden rounded-2xl
                      ring-1 ring-slate-900/5">
                                <img
                                    src="/indexbackground5.jpg"
                                    alt="Nursing cohort studying together"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>

                    </div>
                </section>
                {/* ═══════════════ IMAGE BAND — QUIET SUPPORT ═══════════════ */}
                <div className="relative w-full bg-slate-50 pb-12 md:pb-20 px-0 md:px-6">
                    <div className="relative max-w-6xl mx-auto
                  h-[320px] md:h-[440px] lg:h-[520px]
                  overflow-hidden rounded-none md:rounded-2xl
                  ring-1 ring-slate-900/5">
                        {/* Slideshow */}
                        {['/high6.png', '/indexbackground2.jpg', '/high3.png'].map((img, index) => (
                            <div
                                key={index}
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
                                style={{ backgroundImage: `url('${img}')`, opacity: index === activeHeroStory % 3 ? 1 : 0 }}
                            />
                        ))}

                        {/* Soft gradient only at bottom for dots to read */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent z-0 pointer-events-none" />

                        {/* Slideshow dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                            {[0, 1, 2].map((index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveHeroStory(index)}
                                    aria-label={`Go to slide ${index + 1}`}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${index === activeHeroStory % 3
                                        ? 'w-8 bg-white'
                                        : 'w-1.5 bg-white/40 hover:bg-white/60'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Mute toggle — small, quiet, in the corner */}
                        <button
                            onClick={() => {
                                setIsMuted(prev => {
                                    const next = !prev;
                                    if (notificationAudioRef.current) notificationAudioRef.current.muted = next;
                                    return next;
                                });
                            }}
                            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                            className="absolute top-3 right-3 z-20
                 w-8 h-8 rounded-lg flex items-center justify-center
                 bg-black/30 backdrop-blur-sm text-white/90
                 hover:bg-black/50 active:scale-95 transition-all"
                            style={{ touchAction: "manipulation" }}
                        >
                            {isMuted
                                ? <VolumeX className="w-3.5 h-3.5" strokeWidth={2.2} />
                                : <Volume className="w-3.5 h-3.5" strokeWidth={2.2} />}
                        </button>
                    </div>
                </div>

                {/* ═══════════════ CAROUSEL ═══════════════ */}
                <div className="relative w-full py-12 md:py-16 bg-white">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-8 md:mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Explore Our Features</h2>
                            <p className="text-slate-500 mt-2">Slide through to discover what Medrae offers</p>
                        </div>

                        {isMobile ? (
                            <div className="relative z-10 px-0 pt-6 md:pt-8 pb-10 md:pb-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                                <HeroMobileCard />
                            </div>
                        ) : (
                            <div className="relative w-full flex flex-col justify-center items-center">
                                <animated.div
                                    {...bind()}
                                    style={{ touchAction: "pan-y pinch-zoom" }}
                                    className="relative w-full h-[550px] flex justify-start items-center overflow-visible touch-pan-y select-none z-10"
                                >
                                    {heroStorySlides.map((slide, idx) => {
                                        const offset = idx - activeHeroStory;
                                        const absOffset = Math.abs(offset);
                                        const scale = offset === 0 ? 1 : 0.85 ** absOffset;
                                        const gap = 30;
                                        const maxSlideWidth = 420;
                                        const slideWidth = Math.min(window.innerWidth * 0.8, maxSlideWidth);
                                        const zIndex = 100 - absOffset;
                                        return (
                                            <div
                                                key={idx}
                                                className="absolute top-0 left-1/2 rounded-xl border-0 transition-all duration-700 ease-out cursor-pointer select-none overflow-hidden group shadow-xl"
                                                style={{
                                                    transform: `translate3d(${offset * (slideWidth + gap) + spring.x.get()}px, 0, 0) scale(${scale})`,
                                                    zIndex,
                                                    opacity: absOffset > 2 ? 0 : 1,
                                                    width: `${slideWidth}px`,
                                                    height: '100%',
                                                }}
                                                onClick={() => { setActiveHeroStory(idx); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 5000); }}
                                                onMouseEnter={() => handleCarouselHover(true)}
                                                onMouseLeave={() => handleCarouselHover(false)}
                                            >
                                                <div className="relative w-full h-full bg-slate-100">
                                                    {!heroMediaLoaded[idx] && (<div className="absolute inset-0 z-10"><HeroSkeleton /></div>)}
                                                    <img src={slide.bg} alt={`Slide ${idx + 1}`}
                                                        onLoad={() => setHeroMediaLoaded(prev => ({ ...prev, [idx]: true }))}
                                                        className="w-full h-full object-cover transition-transform duration-2000 group-hover:scale-110"
                                                        style={{ opacity: heroMediaLoaded[idx] ? 1 : 0 }} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                                </div>
                                                <div className="absolute inset-0 flex flex-col justify-end p-10 text-white text-left space-y-4">
                                                    <div className="w-12 h-1 bg-blue-500 rounded-full mb-2 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                                    <div className="text-xl md:text-2xl leading-tight tracking-tight drop-shadow-lg">
                                                        {typeof slide.text === "string" ? slide.text : React.isValidElement(slide.text) ? slide.text : null}
                                                    </div>
                                                </div>
                                                {idx === activeHeroStory && (
                                                    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                                                        <button className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-md text-white rounded-full pointer-events-auto hover:bg-white/40 transition-all active:scale-90 border border-white/30 shadow-xl"
                                                            onClick={(e) => { e.stopPropagation(); setActiveHeroStory((prev) => Math.max(prev - 1, 0)); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 5000); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                                                        </button>
                                                        <button className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-md text-white rounded-full pointer-events-auto hover:bg-white/40 transition-all active:scale-90 border border-white/30 shadow-xl"
                                                            onClick={(e) => { e.stopPropagation(); setActiveHeroStory((prev) => Math.min(prev + 1, heroStorySlides.length - 1)); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 5000); }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-white/80">
                                                    {idx + 1} / {heroStorySlides.length}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </animated.div>
                                <div className="mt-12 flex gap-3 z-20">
                                    {heroStorySlides.map((_, idx) => (
                                        <button key={idx}
                                            onClick={() => { setActiveHeroStory(idx); setIsAutoPlaying(false); setTimeout(() => setIsAutoPlaying(true), 5000); }}
                                            className={`transition-all duration-500 rounded-full ${idx === activeHeroStory ? 'w-10 bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'w-2.5 bg-gray-300 hover:bg-gray-400'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══════════════ PROOF — QUIET, NOT SHOUTY ═══════════════ */}
                <section
                    id="stats"
                    ref={statsRef}
                    className="w-full bg-white border-y border-slate-200/70
             py-10 md:py-14 px-4 md:px-6"
                >
                    <div className="max-w-5xl mx-auto">
                        <p className="text-[11px] md:text-[12px] font-semibold
                  uppercase tracking-[0.15em] text-slate-400 mb-6 md:mb-8">
                            In numbers
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6 md:gap-x-10">
                            {[
                                { value: `${studentCount.toLocaleString()}+`, label: "Students preparing" },
                                { value: `${questionCount.toLocaleString()}+`, label: "Exam-style questions" },
                                { value: `${successRate}%`, label: "Average score lift" },
                                { value: "4.8", label: "Rated by users", suffix: "★" },
                            ].map((s, i) => (
                                <div key={i}>
                                    <p className="text-[22px] md:text-[26px] font-semibold text-slate-900
                        tabular-nums leading-none tracking-tight">
                                        {s.value}
                                        {s.suffix && <span className="text-amber-500 ml-1">{s.suffix}</span>}
                                    </p>
                                    <p className="mt-2 text-[12px] md:text-[13px] text-slate-500 leading-snug">
                                        {s.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══════════════ FEATURES ═══════════════ */}
                <section id="features" className="py-16 md:py-24 px-4 md:px-6 bg-white text-slate-900">
                    <div className="max-w-7xl mx-auto">

                        {/* ── SECTION HEADER ── */}
                        <AnimatedSection direction="up">
                            <div className="text-center mb-12 md:mb-16 space-y-3 md:space-y-4">
                                <h2 className="text-3xl md:text-4xl lg:text-5xl tracking-tighter text-slate-800 font-bold">
                                    Everything You Need to{" "}
                                    <span className="text-blue-600 italic">Pass NCK, FQEs & Nursing Exams</span>
                                </h2>
                                <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
                                    Stop wasting time searching through random PDFs. Medrae organizes revision
                                    into structured units and smart analytics — for DCHN, BSN, KRN and all
                                    nursing cadres.
                                </p>
                            </div>
                        </AnimatedSection>

                        {/* ── HERO VIDEO ROW ── side-by-side on desktop, stacked on mobile */}
                        <AnimatedSection direction="up" delay={80}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center mb-14 md:mb-20">
                                {/* Left: text */}
                                <div className="order-2 lg:order-1 text-center lg:text-left">

                                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                                        Train like it's{" "}
                                        <span className="text-blue-600">the real exam day.</span>
                                    </h3>

                                    <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                                        6,500+ exam-style questions written to match the way the NCK actually
                                        asks them  by unit, by condition, by difficulty. Every answer comes
                                        with an explanation, every mistake gets saved to a personal log, and
                                        every weak topic surfaces before exam day. The entire curriculum is
                                        mapped to the NCK syllabus, so you're never studying from scattered PDFs.
                                    </p>

                                    <p className="mt-4 text-sm md:text-base text-slate-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
                                        Built for DCHN, BSN, and KRN students across Kenya  with the structure,
                                        pacing, and pressure-testing that nursing school doesn't always give you.
                                    </p>

                                    <div className="mt-6 flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                                        <button
                                            onClick={() => navigate("/register")}
                                            className="inline-flex items-center gap-2
                       px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700
                       text-white text-[13px] font-bold
                       hover:scale-[1.02] active:scale-[0.97]
                       transition-all duration-300"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            Start Free <ArrowRight className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => navigate("/login")}
                                            className="inline-flex items-center gap-2
                       px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200
                       text-slate-700 text-[13px] font-bold
                       hover:scale-[1.02] active:scale-[0.97]
                       transition-all duration-300"
                                            style={{ touchAction: "manipulation" }}
                                        >
                                            Sign in
                                        </button>
                                    </div>

                                    <p className="mt-5 text-[12px] text-slate-400">
                                        Free to start. No credit card required.
                                    </p>
                                </div>                                {/* Right: video in a constrained card */}
                                <div className="order-1 lg:order-2 -mx-4 md:mx-0">
                                    <div className="relative overflow-hidden bg-slate-900
                    rounded-none md:rounded-2xl
                    shadow-none md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
                    md:ring-1 md:ring-slate-900/5">
                                        <div className="relative aspect-video w-full">
                                            <video
                                                className="w-full h-full object-cover"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                                preload="metadata"
                                                controls
                                            >
                                                <source src="/videos/Medrae1.mp4" type="video/mp4" />
                                                Your browser does not support the video tag.
                                            </video>
                                            <div className="absolute bottom-0 left-0 right-0
                            bg-gradient-to-t from-black/70 to-transparent
                            p-4 md:p-5 pointer-events-none">
                                                <p className="text-white text-xs md:text-sm font-medium opacity-90">
                                                    Medrae Nursing Kenya — Made for Nurses
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>

                        {/* ── FEATURE CARDS ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                            {/* Core features */}
                            {features.filter(f => f.category === "Core").map((feature, index) => {
                                const IconComponent = feature.icon;
                                const isHighlighted = (feature as any).isHighlighted;
                                return (
                                    <AnimatedCard key={index} index={index}>
                                        <Card
                                            className="bg-white hover:bg-slate-50 border border-slate-100
                                       rounded-2xl shadow-sm hover:shadow-md
                                       hover:-translate-y-1 transition-all duration-300
                                       cursor-pointer p-5 group h-full"
                                            onClick={() => navigate("/register")}
                                        >
                                            <CardHeader className="p-0 mb-3">
                                                <div
                                                    className={`h-11 w-11 rounded-xl flex items-center justify-center
                                                mb-3 shadow-sm transition-transform duration-300
                                                group-hover:scale-110
                                                ${isHighlighted
                                                            ? "bg-gradient-to-br from-orange-500 to-red-500"
                                                            : "bg-gradient-to-br from-blue-600 to-blue-700"}`}
                                                >
                                                    <IconComponent className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-[15px] font-bold tracking-tight text-slate-900 leading-tight">
                                                    {feature.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <CardDescription className="text-slate-500 text-[12.5px] leading-relaxed">
                                                    {feature.description}
                                                </CardDescription>
                                                {isHighlighted && (
                                                    <div className="mt-3 inline-flex items-center gap-1.5
                                                    bg-orange-50 text-orange-700
                                                    px-2.5 py-1 rounded-full
                                                    text-[9px] font-bold uppercase tracking-wider">
                                                        <Timer className="w-3 h-3" />
                                                        Timed · Pressure Test · Instant Results
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </AnimatedCard>
                                );
                            })}

                            {/* "More" card — spans 2 cols on tablet, 1 on desktop */}
                            {features.filter(f => (f as any).isMoreCard).map((feature, index) => {
                                const IconComponent = feature.icon;
                                const coreCount = features.filter(f => f.category === "Core").length;
                                return (
                                    <AnimatedCard
                                        key={index}
                                        index={coreCount}
                                    >
                                        <Card className="bg-gradient-to-br from-blue-50 to-purple-50
                                          hover:from-blue-100 hover:to-purple-100
                                          border-0 rounded-2xl shadow-sm hover:shadow-md
                                          hover:-translate-y-1 transition-all duration-300
                                          p-5 group h-full
                                          sm:col-span-2 lg:col-span-1">
                                            <CardHeader className="p-0 mb-3">
                                                <div className="h-11 w-11 bg-gradient-to-br from-purple-500 to-indigo-600
                                                rounded-xl flex items-center justify-center mb-3
                                                shadow-sm group-hover:scale-110 transition-transform duration-300">
                                                    <IconComponent className="h-5 w-5 text-white" />
                                                </div>
                                                <CardTitle className="text-[15px] font-bold tracking-tight text-slate-900">
                                                    {feature.title}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <CardDescription className="text-slate-600 text-[12.5px] leading-relaxed mb-3">
                                                    {feature.description}
                                                </CardDescription>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                    {(feature as any).moreItems?.slice(0, 8).map((item: any, i: number) => {
                                                        const ItemIcon = item.icon;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className="flex items-center gap-1.5
                                                           bg-white/70 rounded-lg
                                                           px-2 py-1.5
                                                           hover:bg-white transition-colors group/item"
                                                            >
                                                                <ItemIcon className="w-3 h-3 text-purple-500
                                                                     group-hover/item:scale-110 transition-transform shrink-0" />
                                                                <span className="text-[10px] font-medium text-slate-600 truncate leading-tight">
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {(feature as any).moreItems && (feature as any).moreItems.length > 8 && (
                                                    <div className="mt-3 text-[10px] font-bold text-purple-600
                                                    uppercase tracking-wider text-center">
                                                        + {(feature as any).moreItems.length - 8} more features
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </AnimatedCard>
                                );
                            })}
                        </div>
                    </div>
                </section>
                <section id="coins">
                    <StudentCoinsSection />
                </section>
                <section id="podcasts">
                    <PodcastShowcaseSection />
                </section>

                <section id="clinical-assessment">
                    <ClinicalAssessmentSection />
                </section>

                <section id="grouppay">
                    <GroupPayLandingSection />
                </section>

                <section id="curriculum"><KRCHNCurriculum /></section>
                <section id="merit-cup"><NursingMeritCupSection /></section>

                <section id="algorithm">
                    <AnimatedSection direction="up">
                        <section className="py-10 md:py-14 px-4 md:px-6 bg-slate-50 overflow-hidden">
                            <div className="max-w-6xl mx-auto">

                                {/* ── HEADER ── */}
                                <div className="text-center mb-8 md:mb-12">
                                    <h2 className="text-[26px] md:text-4xl lg:text-[44px] font-bold tracking-tighter
                                   text-slate-900 leading-tight">
                                        The Medrae Nursing{" "}
                                        <span className="text-violet-600">AI Algorithm</span>
                                    </h2>
                                    <p className="mt-2.5 text-[14px] md:text-[15px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
                                        Know exactly where you stand. Our AI predicts your NCK exam
                                        performance with 95% accuracy.
                                    </p>
                                </div>

                                {/* ── SINGLE FLAT CARD ── */}
                                <div className="rounded-2xl bg-white overflow-hidden">
                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr]">

                                        {/* ── LEFT: Big score ── */}
                                        <div className="p-6 md:p-10 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                                    Your predicted NCK score
                                                </p>
                                                <p className="text-[88px] md:text-[120px] font-bold text-slate-900
                                              tabular-nums leading-[0.9] tracking-tighter mt-2">
                                                    95<span className="text-violet-500">%</span>
                                                </p>

                                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                    <span className="inline-flex items-center gap-1.5
                                                     text-[11px] font-bold text-emerald-700">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        High readiness
                                                    </span>
                                                    <span className="text-slate-300">·</span>
                                                    <span className="inline-flex items-center gap-1.5
                                                     text-[11px] font-semibold text-slate-500">
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        +12% this month
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stats — plain row, no boxes */}
                                            <div className="mt-8 pt-6 border-t border-slate-200/70
                                            grid grid-cols-3 gap-4">
                                                {[
                                                    { value: "8", label: "Units tracked" },
                                                    { value: "78%", label: "Avg score" },
                                                    { value: "2", label: "Weak units" },
                                                ].map((stat, i) => (
                                                    <div key={i}>
                                                        <p className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums leading-none">
                                                            {stat.value}
                                                        </p>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5">
                                                            {stat.label}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ── DIVIDER — solid line only, no shadow ── */}
                                        <div className="hidden lg:block bg-slate-200" />

                                        {/* ── RIGHT: Feature list ── */}
                                        <div className="p-6 md:p-10 border-t lg:border-t-0 border-slate-200/70">
                                            <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                                                Know your strengths.{" "}
                                                <span className="text-violet-600">Fix your weaknesses.</span>
                                            </h3>
                                            <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
                                                The Medrae algorithm analyzes every question you answer
                                                to build a complete picture of your NCK readiness.
                                            </p>

                                            <ul className="mt-6 space-y-4">
                                                {[
                                                    { icon: Trophy, label: "Identify your strongest units", desc: "See which units you're already acing — so you don't waste hours re-learning what you know." },
                                                    { icon: AlertTriangle, label: "Pinpoint critical weak areas", desc: "The algorithm surfaces the exact topics that need work — no more guessing where to focus." },
                                                    { icon: TrendingUp, label: "Track improvement over time", desc: "Watch your predicted score climb as you practice. Small gains accumulate into real readiness." },
                                                    { icon: Target, label: "Get personalized recommendations", desc: "Every session ends with a next-step list. Your study plan writes itself." },
                                                ].map((item, i) => {
                                                    const Icon = item.icon;
                                                    return (
                                                        <li key={i} className="flex gap-3">
                                                            <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-50
                                                            flex items-center justify-center mt-0.5">
                                                                <Icon className="w-4 h-4 text-violet-600" strokeWidth={2.2} />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                                                                    {item.label}
                                                                </p>
                                                                <p className="text-[12px] text-slate-500 leading-relaxed mt-1">
                                                                    {item.desc}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>

                                            <p className="mt-6 pt-4 border-t border-slate-200/70
                                          text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                                                Available for premium members · From 399 KSh
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── TESTIMONIAL ── */}
                                <div className="mt-8 md:mt-10 max-w-2xl mx-auto text-center">
                                    <p className="text-[13px] md:text-[14px] text-slate-600 font-medium italic leading-relaxed">
                                        "The algorithm showed me exactly which units needed work.
                                        I went from 62% to 84% in 3 weeks."
                                    </p>
                                    <p className="text-[11px] md:text-[12px] font-bold text-slate-800 mt-2">
                                        — Sarah K., KMTC Nairobi
                                    </p>
                                </div>
                            </div>
                        </section>
                    </AnimatedSection>
                </section>
                {/* ═══════════════ ABOUT ═══════════════ */}
                <section id="about">
                    <AnimatedSection direction="up">
                        <section className="py-10 md:py-14 px-4 md:px-6 bg-white relative overflow-hidden">
                            {/* Soft accent blobs — subtler than before */}
                            <div className="absolute top-0 right-0 w-[240px] md:w-[380px] h-[240px] md:h-[380px]
                            bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-[240px] md:w-[380px] h-[240px] md:h-[380px]
                            bg-violet-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                            <div className="max-w-7xl mx-auto relative z-10">

                                {/* ── HEADER ── */}
                                <div className="text-center mb-8 md:mb-12">

                                    <h2 className="text-[26px] md:text-4xl lg:text-[44px] font-bold tracking-tighter
                                   text-slate-900 leading-tight">
                                        Why Medrae{" "}
                                        <span className="text-purple-600">exists.</span>
                                    </h2>
                                    <p className="mt-2.5 text-[14px] md:text-[15px] text-slate-500 max-w-2xl mx-auto leading-relaxed">
                                        A nurse-first platform built to replace chaotic revision with
                                        structured, measurable practice.
                                    </p>
                                </div>

                                {/* ── MAIN GRID: cards + image ── */}
                                <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,380px)] gap-6 lg:gap-10 items-stretch">

                                    {/* LEFT: Mission + Vision + Slogan */}
                                    <div className="space-y-4 md:space-y-5">

                                        {/* Mission */}
                                        <div className="rounded-2xl bg-white ring-1 ring-slate-200/70
                                        shadow-sm hover:shadow-md hover:-translate-y-0.5
                                        p-5 md:p-6 transition-all duration-300 group">
                                            <div className="flex items-start gap-3 md:gap-4">
                                                <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0
                                                group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                                                    <Target className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" strokeWidth={2.2} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-[15px] md:text-base font-bold text-slate-900">
                                                            Our Mission
                                                        </h3>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider
                                                         text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                                                            I.P
                                                        </span>
                                                    </div>
                                                    <p className="mt-1.5 text-[12.5px] md:text-[13px] text-slate-500 leading-relaxed">
                                                        To eliminate random, unstructured revision and replace it with a
                                                        focused nursing exam system that builds confidence through
                                                        repeated, intelligent practice.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vision */}
                                        <div className="rounded-2xl bg-white ring-1 ring-slate-200/70
                                        shadow-sm hover:shadow-md hover:-translate-y-0.5
                                        p-5 md:p-6 transition-all duration-300 group">
                                            <div className="flex items-start gap-3 md:gap-4">
                                                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0
                                                group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                                    <Eye className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" strokeWidth={2.2} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-[15px] md:text-base font-bold text-slate-900">
                                                            Our Vision
                                                        </h3>
                                                        <span className="text-[9px] font-bold uppercase tracking-wider
                                                         text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                                            P.D.P
                                                        </span>
                                                    </div>
                                                    <p className="mt-1.5 text-[12.5px] md:text-[13px] text-slate-500 leading-relaxed">
                                                        To become Kenya's most trusted nursing exam preparation platform
                                                        by helping students pass faster through structured, measurable,
                                                        performance-driven practice.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slogan strip */}
                                        <div className="rounded-2xl bg-gradient-to-r from-purple-50 via-slate-50 to-blue-50
                                        ring-1 ring-purple-100 p-4 md:p-5
                                        flex items-center gap-3 md:gap-4">
                                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl
                                            bg-gradient-to-br from-purple-500 to-indigo-600
                                            flex items-center justify-center shrink-0 shadow-sm">
                                                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.4} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                                    Our core slogan
                                                </p>
                                                <p className="text-[13px] md:text-[15px] font-bold italic
                                              bg-gradient-to-r from-purple-700 to-blue-700
                                              bg-clip-text text-transparent leading-snug mt-0.5">
                                                    "Advancing nursing education and student success."
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT: Image (no phone frame) */}
                                    <div className="relative rounded-2xl overflow-hidden bg-slate-100
                                    ring-1 ring-slate-200/70 shadow-sm
                                    min-h-[280px] lg:min-h-full">
                                        {!heroMediaLoaded[activeHeroStory] && (
                                            <div className="absolute inset-0 z-10"><HeroSkeleton /></div>
                                        )}
                                        <img
                                            src="/high6.png"
                                            alt="Medrae nurses"
                                            className="w-full h-full object-cover transition-opacity duration-700"
                                            onLoad={() => setHeroMediaLoaded(prev => ({ ...prev, [activeHeroStory]: true }))}
                                            style={{ opacity: heroMediaLoaded[activeHeroStory] ? 1 : 0 }}
                                        />

                                        {/* Subtle gradient overlay for caption readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />

                                        {/* Bottom caption */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                                                Built for nurses
                                            </p>
                                            <p className="text-[13px] md:text-[14px] font-bold text-white mt-1 leading-tight">
                                                From study to licensure — every step supported.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </AnimatedSection>
                </section>

                {/* ═══════════════ CTA ═══════════════ */}
                <section id="cta">
                    <AnimatedSection direction="up">
                        <section className="relative py-14 md:py-20 px-0 md:px-6 overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500 via-blue-600 to-blue-800" />
                            <div className="absolute top-0 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-white/10 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
                            <div className="absolute bottom-0 right-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-300/20 rounded-full blur-[80px] translate-y-1/2 animate-pulse" />

                            <div className="max-w-7xl mx-auto relative z-10 px-4 md:px-0">
                                <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-12">

                                    {/* ── VIDEO on the LEFT ── */}
                                    <div className="lg:w-[45%] w-full flex justify-center lg:justify-start order-1 lg:order-1">
                                        <div className="relative group w-full max-w-[420px]">
                                            <div className="absolute -inset-4 bg-white/5 rounded-3xl blur-xl group-hover:bg-blue-400/10 transition-colors" />
                                            <div className="relative bg-slate-900 rounded-2xl
                                            shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)]
                                            ring-1 ring-white/10
                                            overflow-hidden
                                            hover:scale-[1.01] transition-transform duration-500">
                                                <video
                                                    className="w-full h-[220px] md:h-[280px] lg:h-[320px] object-cover"
                                                    autoPlay
                                                    muted
                                                    loop
                                                    playsInline
                                                    preload="metadata"
                                                    controls
                                                >
                                                    <source src="/videos/Medrae2.mp4" type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── TEXT + CTA on the RIGHT ── */}
                                    <div className="lg:w-[55%] text-center lg:text-left space-y-5 md:space-y-6 order-2 lg:order-2">


                                        <h2 className="text-[26px] md:text-4xl lg:text-5xl text-white leading-[1.1] tracking-tighter font-bold">
                                            Ready to pass your{" "}
                                            <span className="text-blue-200 italic">Nursing, FQEs & NCK exams?</span>
                                        </h2>

                                        <p className="text-[13px] md:text-[15px] lg:text-[16px] text-blue-50 leading-relaxed max-w-xl mx-auto lg:mx-0">
                                            Stop scrolling through confusing PDFs. Join Medrae and train daily with{" "}
                                            <span className="text-white font-bold">instant explanations</span>,
                                            unit-based drills, and simulations designed for clinical success —
                                            across all nursing cadres.
                                        </p>

                                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                                            <Button
                                                size="lg"
                                                className="w-full sm:w-auto h-12 md:h-13 px-6 md:px-8 rounded-xl
                                           bg-white text-blue-700 hover:bg-blue-50
                                           text-[13px] md:text-[14px] font-bold
                                           shadow-lg shadow-blue-900/20
                                           transition-all active:scale-[0.97] group
                                           hover:scale-[1.02]"
                                                onClick={() => navigate("/register")}
                                            >
                                                Get Started Now
                                                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
                                            </Button>

                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-2">
                                                    {[1, 2, 3, 4].map((i) => (
                                                        <div
                                                            key={i}
                                                            className="w-7 h-7 md:w-8 md:h-8 rounded-full
                                                       border-2 border-blue-500 bg-slate-200 overflow-hidden"
                                                        >
                                                            <img
                                                                src={`https://i.pravatar.cc/100?img=${i + 10}`}
                                                                alt=""
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[11px] md:text-[12px] font-bold text-white/90">
                                                    +2k students already training
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </AnimatedSection>
                </section>
                <FloatingWhatsApp />
                {/* 🆕 Footer — extracted component */}
                <SiteFooter />
            </div>
        </div>
    );
}