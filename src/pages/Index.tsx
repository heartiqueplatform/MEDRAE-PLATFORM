import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play, MessageSquare, LogOut, Volume, VolumeX, GraduationCap, CheckCircle2, Eye, Target, ExternalLink, Mail, Facebook, Linkedin, Instagram, Twitter, Gauge, TrendingUp, AlertTriangle, Trophy, BookOpen, Sparkles, Zap, Award, Clock, BarChart3, Shield, FileQuestion, Timer, Layers, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDrag } from '@use-gesture/react';
import { useSpring, animated, config } from '@react-spring/web';
import { supabase } from "@/lib/supabaseClient";
import HeroMobileCard from "@/components/HeroMobileCard";
import ExitOverlay from '@/components/ExitOverlay';
import KRCHNCurriculum from '@/components/index/KRCHNCurriculum';
import Header from '@/components/index/Header';
import ClinicalAssessmentSection from '@/components/index/ClinicalAssessmentSection';
import GroupPayLandingSection from '@/components/grouppay/GroupPayLandingSection';


// ============================================================
// ANIMATION UTILITY: Intersection Observer for scroll animations
// ============================================================
const useIntersectionObserver = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isVisible];
};

// ============================================================
// ANIMATION UTILITY: Counter animation
// ============================================================
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
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, target, duration]);

  return [ref, count];
};

// ============================================================
// HERO SKELETON
// ============================================================
const HeroSkeleton = () => {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm animate-pulse">
      <div className="w-full h-[70%] bg-white/20" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-white/30 rounded" />
        <div className="h-4 w-1/2 bg-white/20 rounded" />
      </div>
    </div>
  );
};

// ============================================================
// ANIMATED SECTION WRAPPER - FASTER ANIMATIONS
// ============================================================
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
      style={{
        transform: isVisible ? 'translateY(0)' : getTransform(),
        transitionDelay: `${delay}ms`,
        ...(className ? { className } : {})
      }}
    >
      {children}
    </div>
  );
};

// ============================================================
// ANIMATED CARD WRAPPER - STAGGERED ENTRY WITH LESS DELAY
// ============================================================
const AnimatedCard = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const [ref, isVisible] = useIntersectionObserver();
  const delay = index * 50; // Reduced from 100ms to 50ms for faster cascade

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const Index = () => {
  const [joyrideReady, setJoyrideReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [heroMediaLoaded, setHeroMediaLoaded] = useState<Record<number, boolean>>({});
  const [activeHeroStory, setActiveHeroStory] = useState(0);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notificationAudioReady, setNotificationAudioReady] = useState(false);
  const [totalMedia, setTotalMedia] = useState(0);
  const [loadedMedia, setLoadedMedia] = useState(0);
  const [allMediaReady, setAllMediaReady] = useState(false);
  const currentYear = new Date().getFullYear();
  const [showExitOverlay, setShowExitOverlay] = useState(false);
  const navigate = useNavigate();

  // Auto-scroll carousel
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null);

  // Stats for counter animation
  const [statsRef, statsVisible] = useIntersectionObserver();
  const [studentCount, setStudentCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [successRate, setSuccessRate] = useState(0);

  useEffect(() => {
    if (statsVisible) {
      // Animate student count
      let start = 0;
      const end = 2231;
      const duration = 2500;
      const step = (timestamp: number) => {
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setStudentCount(Math.floor(eased * end));
        if (progress < 1) requestAnimationFrame(step);
      };
      const startTime = performance.now();
      requestAnimationFrame(step);

      // Animate question count
      let qStart = 0;
      const qEnd = 15400;
      const qDuration = 2000;
      const qStep = (timestamp: number) => {
        const progress = Math.min((timestamp - qStartTime) / qDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setQuestionCount(Math.floor(eased * qEnd));
        if (progress < 1) requestAnimationFrame(qStep);
      };
      const qStartTime = performance.now();
      requestAnimationFrame(qStep);

      // Animate success rate
      let sStart = 0;
      const sEnd = 78;
      const sDuration = 1800;
      const sStep = (timestamp: number) => {
        const progress = Math.min((timestamp - sStartTime) / sDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setSuccessRate(Math.floor(eased * sEnd));
        if (progress < 1) requestAnimationFrame(sStep);
      };
      const sStartTime = performance.now();
      requestAnimationFrame(sStep);
    }
  }, [statsVisible]);

  // Auto-play carousel
  useEffect(() => {
    if (isAutoPlaying && !isMobile) {
      autoPlayInterval.current = setInterval(() => {
        setActiveHeroStory(prev => (prev + 1) % heroStorySlides.length);
      }, 2000);
    }
    return () => {
      if (autoPlayInterval.current) {
        clearInterval(autoPlayInterval.current);
      }
    };
  }, [isAutoPlaying, isMobile]);

  // Pause autoplay on hover
  const handleCarouselHover = useCallback((isHovering: boolean) => {
    setIsAutoPlaying(!isHovering);
  }, []);

  const handleMediaLoad = () => {
    setLoadedMedia(prev => prev + 1);
  };

  useEffect(() => {
    if (totalMedia > 0 && loadedMedia >= totalMedia) {
      setAllMediaReady(true);
    }
  }, [loadedMedia, totalMedia]);

  useEffect(() => {
    const mediaUrls = [
      ...heroStorySlides.flatMap(s => [s.bg]),
      "/sounds/notification.mp3",
    ];
    setTotalMedia(mediaUrls.length);
    mediaUrls.forEach(url => {
      if (url.endsWith(".mp3")) {
        const audio = new Audio(url);
        audio.oncanplaythrough = handleMediaLoad;
        audio.onerror = handleMediaLoad;
      } else if (url.endsWith(".mp4")) {
        const video = document.createElement("video");
        video.src = url;
        video.onloadeddata = handleMediaLoad;
        video.onerror = handleMediaLoad;
      } else {
        const img = new Image();
        img.src = url;
        img.onload = handleMediaLoad;
        img.onerror = handleMediaLoad;
      }
    });
  }, []);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    const preloadMedia = async () => {
      if (!heroStorySlides?.length) return;
      const mediaUrls = heroStorySlides.flatMap(slide => [slide.bg]);
      const loadPromises = mediaUrls.map(url => {
        return new Promise<void>((resolve) => {
          if (url.endsWith('.mp4')) {
            const video = document.createElement('video');
            video.src = url;
            video.onloadeddata = () => resolve();
            video.onerror = () => resolve();
          } else {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
      });

      await Promise.all(loadPromises);
      setHeroMediaLoaded(heroStorySlides.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {}));
    };

    preloadMedia();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!navigate) return;
        if (session?.user) {
          navigate("/redirect", { replace: true });
          return;
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
      setReady(true);
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    setVideoVisible(true);
  }, []);

  useEffect(() => {
    if (allMediaReady) {
      setJoyrideReady(true);
    }
  }, [allMediaReady]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
      } else if (e.key === "ArrowLeft") {
        setActiveHeroStory(prev => Math.max(prev - 1, 0));
      }
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
              <img
                src="/pwa-192x192.jpeg"
                alt="Medrae Logo"
                className="h-12 w-12 md:h-16 md:w-16 rounded-sm object-contain"
              />
            </div>

            <h1 className="text-center text-4xl font-black tracking-wide">
              <span style={{ color: "#e90000" }}>
                MEDRAE
              </span>

              <span
                className="ml-2"
                style={{ color: "#ffffff" }}
              >
                NURSING
              </span>
            </h1>
          </div>
        </div>
      ),
    },
    {
      bg: "/indexbackground3.jpg",
      text: (
        <h2 className="text-sm md:text-xl font-semibold leading-snug text-gray-900 md:text-white">
          Medrae is built for serious NCK,FQEs exam preparation. Practice 6,500+ updated NCK-style questions, get instant explanations after every answer, and focus directly on your weakest and most tested units.
        </h2>
      ),
    },
    {
      bg: "/indexbackground6.jpg",
      text: (
        <div className="flex flex-col gap-2 items-center">
          <Button
            size="lg"
            className="bg-blue-500 text-white font-bold text-lg md:text-2xl px-8 py-3 rounded-3xl shadow-lg transition-all duration-300 md:hover:bg-blue-600 md:hover:scale-105"
            onClick={() => navigate('/register')}
          >
            Create Account
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-yellow-500 text-blue-500 font-bold text-base md:text-lg px-8 py-3 rounded-3xl shadow-lg transition-all duration-300 md:hover:bg-blue-500 md:hover:text-white md:hover:scale-105"
            onClick={() => navigate('/login')}
          >
            Sign In to Continue
          </Button>
        </div>
      ),
    },
    {
      bg: "/background03.jpg",
      text: (
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 md:text-white">
          Kenya's Structured NCK AND FQEs Exam Practice Platform
        </h2>
      ),
    },
    {
      bg: "/indexbackground5.jpg",
      text: (
        <h2 className="text-sm md:text-xl font-semibold leading-snug text-gray-900 md:text-white">
          <p className="font-semibold text-2xl text-white">
            For Tutors & Institutions
          </p>
          <p>
            Medrae also offers affordable institutional online exam hosting with a powerful
            DigiProctor system. Tutors can upload revision questions, CATs, assignments,
            mock exams, and internal assessments all fully digitized and automatically tracked.
          </p>
          <p>
            Save time on marking, go fully digital, and train your students to confidently
            sit any computer-based exam including NCK without fear.
          </p>
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
          Access the full NCK revision system—structured units, instant explanations, weak-topic tracking, and a growing bank of 6,500+ questions updated regularly to match exam trends.
        </h2>
      ),
    },
  ];

  const [spring, api] = useSpring(() => ({ x: 0 }));
  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], cancel, event }) => {
      if (event?.type?.startsWith("touch") || event?.type?.startsWith("pointer")) {
        event.preventDefault();
      }
      api.start({ x: mx });
      if (!down) {
        if (mx < -100) {
          setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
        } else if (mx > 100) {
          setActiveHeroStory(prev => Math.max(prev - 1, 0));
        }
        api.start({ x: 0 });
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true, mouse: true },
      passive: false
    }
  );

  useEffect(() => {
    let scrolling = false;
    const handleWheel = (e: WheelEvent) => {
      if (scrolling) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
        if (e.deltaX > 0) {
          setActiveHeroStory(prev => Math.max(prev - 1, 0));
        } else {
          setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
        }
        scrolling = true;
        setTimeout(() => {
          scrolling = false;
        }, 250);
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const features = [
    // ===== CORE FEATURE 1: Instant Answer Explanations =====
    {
      icon: Brain,
      title: "Instant Answer Explanations",
      description: "Tap any answer and immediately see why it's correct or wrong with detailed rationales. No guessing. No searching through textbooks. Understand the 'why' behind every answer and lock in the knowledge instantly. Each explanation includes key concepts, nursing interventions, and NCK exam tips to reinforce your learning.",
      category: "Core"
    },

    // ===== CORE FEATURE 2: Unit-Based Smart Revision =====
    {
      icon: Users,
      title: "Unit-Based Smart Revision",
      description: "Jump directly to your weakest or most tested NCK nursing units. Focus your study time where it matters most. Our smart revision system identifies which nursing units appear most frequently in exams and prioritizes them in your practice sessions. Eliminate blind revision and study with surgical precision.",
      category: "Core"
    },

    // ===== CORE FEATURE 3: Failed Question Tracker =====
    {
      icon: Star,
      title: "Failed Question Tracker",
      description: "Every question you get wrong is automatically saved to your personal 'Mistakes Log.' Revisit, review, and retrain until you master the concept. Our system identifies patterns in your mistakes and creates targeted practice sessions to convert your weaknesses into guaranteed marks. Stop making the same mistakes twice.",
      category: "Core"
    },

    // ===== CORE FEATURE 4: 6,500+ Updated Questions =====
    {
      icon: Play,
      title: "6,500+ NCK-Style Questions",
      description: "Practice from a constantly growing question bank of 6,500+ updated NCK-style questions designed around real exam patterns. Each question is vetted by nursing educators and aligned with the latest NCK curriculum. Train with exam-relevant content—not outdated material. New questions added weekly to keep you ahead.",
      category: "Core"
    },

    // ===== CORE FEATURE 5: DigiProctor Exam Simulation (Highlighted) =====
    {
      icon: Shield,
      title: "DigiProctor Exam Simulation",
      description: "Experience the full NCK exam experience with our DigiProctor-style practice mode. Timed sessions with 75 questions in 60 minutes, real exam interface with question navigation and flagging, pressure testing with progressively challenging questions, and instant performance analysis with unit-by-unit breakdown. Train like it's the actual exam day and eliminate exam anxiety.",
      category: "Core",
      isHighlighted: true
    },

    // ===== CORE FEATURE 6: For Tutors & Institutions =====
    {
      icon: GraduationCap,
      title: "For Tutors & Institutions",
      description: "Affordable institutional online exam hosting powered by our secure DigiProctor system. Upload revision questions, CATs, assignments, mock exams, and internal assessments — all fully digitized and automatically tracked. Save hours on marking, go fully digital, and train your students to confidently sit any computer-based exam including NCK without fear. Results released within 12 hours with one click.",
      category: "Core"
    },

    // ===== THE "MORE FEATURES" CARD =====
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
  const handleExitApp = () => {
    setShowExitOverlay(true);
  };

  const finalExitAction = () => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.quitApp();
    } else {
      alert("Exit successful. Please close the tab.");
      window.location.href = "https://google.com";
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden hide-scrollbar relative bg-slate-50">
      <Header />

      <ExitOverlay
        isOpen={showExitOverlay}
        onExit={finalExitAction}
      />

      {/* ============================================================ */}
      {/* HERO SECTION - Full Background Slideshow */}
      {/* ============================================================ */}
      <div
        id="home"
        className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden"
      >
        {/* Background Slideshow Images */}
        {['/high6.png', '/indexbackground2.jpg', '/high3.png'].map((img, index) => (
          <div
            key={index}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{
              backgroundImage: `url('${img}')`,
              opacity: index === activeHeroStory % 3 ? 1 : 0,
            }}
          />
        ))}

        {/* Gradient mask overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-0"></div>

        {/* Background Marquee */}
        <div className="absolute w-full left-0 top-[70%] overflow-hidden z-0 pointer-events-none opacity-20 md:opacity-10">
          <div className="absolute whitespace-nowrap animate-marquee text-[40px] md:text-[50px] lg:text-[70px] font-black text-slate-900 md:text-white select-none pointer-events-none tracking-tighter">
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
          </div>
        </div>

        {/* FLOATING EXIT BUTTON */}
        <button
          onClick={handleExitApp}
          className="hidden md:flex fixed top-6 left-6 z-[9999]
      bg-white/80 backdrop-blur-md
      hover:bg-white/95 border border-slate-200/50
      text-slate-700 hover:text-red-600
      shadow-lg shadow-slate-200/50 hover:shadow-red-200/50
      w-10 h-10 rounded-xl
      transition-all duration-300 active:scale-95
      items-center justify-center group
      hover:w-auto hover:px-4 hover:gap-2.5"
        >
          <LogOut className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:text-red-500 transition-all flex-shrink-0" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-slate-600 group-hover:text-red-600 transition-all duration-300 max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[100px] group-hover:ml-1">
            Exit System
          </span>
        </button>

        {/* Audio Toggle */}
        <button
          className="absolute top-4 right-4 md:top-6 md:right-6 bg-white/10 backdrop-blur-md border border-white/20 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl z-50 hover:bg-white/20 transition-all shadow-xl active:scale-95"
          onClick={() => {
            setIsMuted(prev => {
              const newMuted = !prev;
              if (notificationAudioRef.current) notificationAudioRef.current.muted = newMuted;
              return newMuted;
            });
          }}
        >
          {isMuted ? <VolumeX className="h-4 w-4 md:h-5 md:w-5" /> : <Volume className="h-4 w-4 md:h-5 md:w-5 animate-pulse" />}
        </button>

        {/* Content on the background image */}
        <div className="relative z-10 flex items-end justify-center h-full pb-10 md:pb-16">
          <div className="text-center text-white px-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight">
              Welcome to <span className="text-red-500">Medrae</span> Nursing
            </h1>
            <p className="text-sm md:text-lg lg:text-xl mt-2 md:mt-3 font-medium text-white/90">
              Your Premier Nursing Exam Preparation Platform
            </p>
          </div>
        </div>

        {/* Top Marquee */}
        <div className="hidden md:block absolute w-full left-0 top-10 overflow-hidden z-0 pointer-events-none select-none opacity-10">
          <div className="whitespace-nowrap animate-marquee text-[30px] md:text-[30px] lg:text-[30px] font-black text-white tracking-tighter">
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
          </div>
        </div>

        {/* Slideshow Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              onClick={() => setActiveHeroStory(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activeHeroStory % 3
                ? 'w-6 bg-white'
                : 'bg-white/40 hover:bg-white/60'
                }`}
            />
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CAROUSEL SECTION - Below the background image */}
      {/* ============================================================ */}
      <div className="relative w-full py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Title */}
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
                      onClick={() => {
                        setActiveHeroStory(idx);
                        setIsAutoPlaying(false);
                        setTimeout(() => setIsAutoPlaying(true), 5000);
                      }}
                      onMouseEnter={() => handleCarouselHover(true)}
                      onMouseLeave={() => handleCarouselHover(false)}
                    >
                      <div className="relative w-full h-full bg-slate-100">
                        {!heroMediaLoaded[idx] && (
                          <div className="absolute inset-0 z-10">
                            <HeroSkeleton />
                          </div>
                        )}
                        <img
                          src={slide.bg}
                          alt={`Slide ${idx + 1}`}
                          onLoad={() => setHeroMediaLoaded(prev => ({ ...prev, [idx]: true }))}
                          className="w-full h-full object-cover transition-transform duration-2000 group-hover:scale-110"
                          style={{ opacity: heroMediaLoaded[idx] ? 1 : 0 }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                      </div>
                      <div className="absolute inset-0 flex flex-col justify-end p-10 text-white text-left space-y-4">
                        <div className="w-12 h-1 bg-blue-500 rounded-full mb-2 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                        <div className="text-xl md:text-2xl font-black leading-tight tracking-tight drop-shadow-lg">
                          {typeof slide.text === "string"
                            ? slide.text
                            : React.isValidElement(slide.text)
                              ? slide.text
                              : null}
                        </div>
                      </div>
                      {idx === activeHeroStory && (
                        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                          <button
                            className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-md text-white rounded-full pointer-events-auto hover:bg-white/40 transition-all active:scale-90 border border-white/30 shadow-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveHeroStory((prev) => Math.max(prev - 1, 0));
                              setIsAutoPlaying(false);
                              setTimeout(() => setIsAutoPlaying(true), 5000);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-6 h-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                          </button>
                          <button
                            className="w-12 h-12 flex items-center justify-center bg-white/20 backdrop-blur-md text-white rounded-full pointer-events-auto hover:bg-white/40 transition-all active:scale-90 border border-white/30 shadow-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveHeroStory((prev) => Math.min(prev + 1, heroStorySlides.length - 1));
                              setIsAutoPlaying(false);
                              setTimeout(() => setIsAutoPlaying(true), 5000);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-6 h-6">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Slide number indicator */}
                      <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-white/80">
                        {idx + 1} / {heroStorySlides.length}
                      </div>
                    </div>
                  );
                })}
              </animated.div>
              <div className="mt-12 flex gap-3 z-20">
                {heroStorySlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveHeroStory(idx);
                      setIsAutoPlaying(false);
                      setTimeout(() => setIsAutoPlaying(true), 5000);
                    }}
                    className={`transition-all duration-500 rounded-full ${idx === activeHeroStory
                      ? 'w-10 bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                      : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                      }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* STATS SECTION - Counter animations */}
      {/* ============================================================ */}
      <section
        id="stats"

        className="py-12 md:py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white" ref={statsRef}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl lg:text-6xl font-black tabular-nums">
                {studentCount.toLocaleString()}+
              </p>
              <p className="text-sm md:text-base font-medium text-blue-200">Active Students</p>
            </div>
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl lg:text-6xl font-black tabular-nums">
                {questionCount.toLocaleString()}+
              </p>
              <p className="text-sm md:text-base font-medium text-blue-200">Practice Questions</p>
            </div>
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl lg:text-6xl font-black tabular-nums">
                {successRate}%
              </p>
              <p className="text-sm md:text-base font-medium text-blue-200">Avg Score Improvement</p>
            </div>
            <div className="space-y-1">
              <p className="text-4xl md:text-5xl lg:text-6xl font-black">4.8★</p>
              <p className="text-sm md:text-base font-medium text-blue-200">User Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FEATURES SECTION - with faster scroll animations */}
      {/* ============================================================ */}
      <section
        id="features"
        className="py-16 md:py-24 px-0 md:px-4 bg-white text-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <AnimatedSection direction="up">
            <div className="text-center mb-10 md:mb-16 space-y-3 md:space-y-4 px-4 md:px-0">
              <div className="inline-flex items-center gap-2 bg-blue-50 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-blue-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-600">The Medrae Advantage</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tighter text-slate-800">
                Everything You Need to <br />
                <span className="text-blue-600 italic">Pass the NCK,,FQEs Exams</span>
              </h2>
              <p className="text-sm md:text-lg lg:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                Stop wasting time searching through random PDFs. Medrae organizes revision into structured units and smart analytics.
              </p>
            </div>
          </AnimatedSection>

          {/* Video Hero - Full Width */}
          <AnimatedSection direction="up" delay={50}>
            <div className="w-full px-4 md:px-6 mb-8 md:mb-12">
              <div className="relative w-75 rounded-[2rem] md:rounded-xl overflow-hidden bg-slate-900  border-0">
                <div className="relative aspect-video w-full">
                  <video
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    controls
                  >
                    <source src="/videos/Medrae1.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-600/80 to-purple-600/80 backdrop-blur-md px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold text-white uppercase tracking-widest shadow-lg">
                    <span className="flex items-center gap-2">
                      <Play className="w-3 h-3 md:w-4 md:h-4" />
                      Platform Demo
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-6">
                    <p className="text-white text-xs md:text-sm font-medium opacity-90">
                      Medrae Nursing Kenya: Made for Nurses
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Features Grid - 4 columns on desktop with faster staggered animation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-4 md:px-0">

            {/* Core Feature Cards - 6 cards with faster staggered entry */}
            {features.filter(f => f.category === "Core").map((feature, index) => {
              const IconComponent = feature.icon;
              const isHighlighted = feature.isHighlighted;

              return (
                <AnimatedCard key={index} index={index}>
                  <Card
                    className={`bg-slate-50/50 hover:bg-white border-none md:rounded-[2rem] md:shadow-sm md:hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:hover:-translate-y-2 transition-all duration-500 cursor-pointer p-3 md:p-4 group h-full ${isHighlighted ? 'ring-2 ring-orange-400/30 md:ring-orange-400/20' : ''
                      }`}
                    onClick={() => navigate('/register')}
                  >
                    <CardHeader className="pt-4 md:pt-6">
                      <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center mb-3 md:mb-4 shadow-lg transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 ${isHighlighted
                        ? "bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-200"
                        : "bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-100"
                        }`}>
                        <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <CardTitle className="text-base md:text-lg font-bold tracking-tight text-slate-800">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pb-2">
                      <CardDescription className="text-slate-500 font-medium leading-relaxed text-xs md:text-sm">
                        {feature.description}
                      </CardDescription>
                      {isHighlighted && (
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider">
                          <Timer className="w-3 h-3" />
                          Timed • Pressure Test • Instant Results
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </AnimatedCard>
              );
            })}

            {/* "More Features" Card - with faster animation */}
            {features.filter(f => f.isMoreCard).map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <AnimatedCard key={index} index={features.filter(f => f.category === "Core").length}>
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-none md:rounded-[2rem] md:shadow-sm md:hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] md:hover:-translate-y-2 transition-all duration-500 p-3 md:p-4 group h-full">
                    <CardHeader className="pt-4 md:pt-6">
                      <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3 md:mb-4 shadow-lg shadow-purple-100 group-hover:rotate-6 group-hover:scale-110 transition-all duration-300">
                        <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <CardTitle className="text-base md:text-lg font-bold tracking-tight text-slate-800">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pb-2">
                      <CardDescription className="text-slate-600 font-medium leading-relaxed text-xs md:text-sm mb-3">
                        {feature.description}
                      </CardDescription>

                      {/* More Features Grid */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {feature.moreItems?.slice(0, 10).map((item, i) => {
                          const ItemIcon = item.icon;
                          return (
                            <div key={i} className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-white/50 hover:bg-white transition-all group/item">
                              <ItemIcon className="w-3 h-3 text-purple-500 group-hover/item:scale-110 transition-transform" />
                              <span className="text-[7px] md:text-[8px] font-medium text-slate-600 truncate leading-tight">
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* "And more" indicator */}
                      {feature.moreItems && feature.moreItems.length > 10 && (
                        <div className="mt-2 text-[8px] md:text-[9px] font-bold text-purple-500 uppercase tracking-wider text-center">
                          + {feature.moreItems.length - 10} more features
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
      <section id="clinical-assessment">
        <ClinicalAssessmentSection />
        <GroupPayLandingSection />
      </section>
      {/* KRCHN Curriculum Section */}
      <section id="curriculum">
        <KRCHNCurriculum />
      </section>
      {/* ============================================================ */}
      {/* MEDRAE ALGORITHM SECTION - with scroll animations */}
      {/* ============================================================ */}
      <section id="algorithm">
        <AnimatedSection direction="up">
          <section className="py-16 md:py-24 px-4 md:px-6 bg-gradient-to-br from-slate-50 to-blue-50/50 overflow-hidden">
            <div className="max-w-7xl mx-auto">
              {/* Section Badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 md:px-6 py-2 rounded-full shadow-lg shadow-blue-200 hover:scale-105 transition-transform cursor-default">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">New Feature</span>
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-800">
                  The Medrae Nursing <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI Algorithm</span>
                </h2>
                <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mt-4 font-medium">
                  Know exactly where you stand. Our AI predicts your NCK exam performance with <span className="text-blue-600 font-bold">95% accuracy</span>.
                </p>
              </div>

              {/* Main Algorithm Card */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden hover:shadow-3xl transition-shadow duration-500">
                <div className="p-6 md:p-10 lg:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left Column: Stats & Visualization */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Gauge className="w-6 h-6 text-blue-600 animate-pulse" />
                        <span className="text-sm font-black uppercase tracking-widest text-blue-600">Real-Time Prediction</span>
                      </div>

                      {/* Score Display */}
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 md:p-8 text-white mb-6 hover:scale-[1.01] transition-transform duration-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium opacity-80">Your Predicted NCK Score</p>
                            <p className="text-5xl md:text-6xl font-black">95%</p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full animate-pulse">
                            <span className="text-sm font-bold uppercase">High Readiness</span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-300" />
                            95% Accuracy
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-blue-300 animate-bounce" />
                            +12% Improvement
                          </span>
                        </div>
                      </div>

                      {/* Quick Stats Grid */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "8", label: "Units Tracked", color: "text-blue-600" },
                          { value: "78%", label: "Avg Score", color: "text-green-600" },
                          { value: "2", label: "Weak Units", color: "text-purple-600" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-300 hover:scale-105">
                            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Features & CTA */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-800">Know Your Strengths. Fix Your Weaknesses.</h3>
                        <p className="text-slate-600 mt-2 text-sm leading-relaxed">
                          The Medrae Nursing Algorithm analyzes every question you answer to build a complete picture of your NCK readiness.
                        </p>
                      </div>

                      {/* Feature List */}
                      <div className="space-y-3">
                        {[
                          { icon: Trophy, label: "Identify your strongest units", color: "text-green-600" },
                          { icon: AlertTriangle, label: "Pinpoint critical weak areas", color: "text-red-600" },
                          { icon: TrendingUp, label: "Track improvement trends", color: "text-blue-600" },
                          { icon: Target, label: "Get personalized recommendations", color: "text-purple-600" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300 hover:scale-[1.02] cursor-default group">
                            <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform`} />
                            <span className="text-sm font-medium text-slate-700">{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA */}
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] group hover:scale-[1.02] p-0 overflow-hidden"
                        onClick={() => navigate('/register')}
                      >
                        <div className="w-full h-full flex items-center justify-center px-4 py-6">
                          <Brain className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                          Check Your Algorithm Dashboard
                          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
                        </div>
                      </Button>
                      <p className="text-[10px] text-slate-400 text-center font-medium uppercase tracking-widest">
                        Available for Premium Members • Starting at 199 KSh
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Testimonial / Social Proof */}
              <div className="mt-8 md:max-w-full md:px-4 lg:px-6 mx-auto text-center">
                <div className="flex justify-center -space-x-2 mb-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden hover:scale-110 transition-transform">
                      <img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="user" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white hover:scale-110 transition-transform">
                    +2k
                  </div>
                </div>
                <p className="text-sm text-slate-600 font-medium italic animate-pulse">
                  "The algorithm showed me exactly which units needed work. I went from 62% to 84% in 3 weeks!"
                </p>
                <p className="text-xs text-slate-400 font-bold mt-1">— Sarah K., KMTC Nairobi</p>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </section>


      {/* ============================================================ */}
      {/* MISSION & VISION SECTION - with scroll animations */}
      {/* ============================================================ */}
      <section id="about">
        <AnimatedSection direction="up">
          <section className="py-16 md:py-24 px-0 md:px-4 bg-slate-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-purple-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 md:gap-16 relative z-10 px-4 md:px-0">
              {/* Text Content Column */}
              <div className="lg:w-3/5 space-y-8 md:space-y-10 order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 text-purple-600 font-black text-[10px] md:text-xs uppercase tracking-[0.2em]">
                  <div className="h-px w-6 md:w-8 bg-purple-600" /> Our Purpose
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
                  {/* Mission Item */}
                  <div className="space-y-3 md:space-y-4 group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-500 group-hover:rotate-6">
                        <Target className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-800">Our Mission</h3>
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                      To eliminate random, unstructured revision and replace it with a focused NCK exam system that builds confidence through repeated, intelligent practice <span className="text-2xl font-bold tracking-tight text-black">(I.P)</span>.
                    </p>
                  </div>
                  {/* Vision Item */}
                  <div className="space-y-3 md:space-y-4 group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500 group-hover:rotate-6">
                        <Eye className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-800">Our Vision</h3>
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                      To become Kenya's most trusted NCK, FQEs exams preparation platform by helping students pass faster through structured, measurable, and performance-driven practice <span className="text-2xl font-bold tracking-tight text-black">(P.D.P)</span>.
                    </p>
                  </div>
                  {/* Slogan Item */}
                  <div className="md:col-span-2 p-5 md:p-8 bg-white/60 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-4 md:gap-6 group hover:border-purple-200 hover:shadow-2xl transition-all duration-500">
                    <div className="p-3 md:p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform duration-500">
                      <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                      <h4 className="text-[10px] md:text-xs uppercase font-black tracking-widest text-slate-400 mb-1">Our Core Slogan</h4>
                      <p className="text-2xl md:text-3xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent italic">
                        "Advancing nursing education and student success."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Image Side */}
              <div className="lg:w-2/5 flex justify-center order-1 lg:order-2">
                <div className="relative w-[240px] md:w-[280px] lg:w-[320px] aspect-[9/18.5] rounded-[2.5rem] md:rounded-[3rem] p-1 md:p-1 bg-slate-800 shadow-2xl ring-4 ring-slate-100 ring-offset-4 ring-offset-slate-50 hover:scale-[1.02] transition-transform duration-500">
                  <div className="w-full h-full relative rounded-[2rem] md:rounded-[2.2rem] overflow-hidden bg-slate-100">
                    {!heroMediaLoaded[activeHeroStory] && (
                      <div className="absolute inset-0 z-10">
                        <HeroSkeleton />
                      </div>
                    )}
                    <img
                      src="high6.png"
                      alt="Medrae Success"
                      className="w-full h-full object-cover transition-opacity duration-1000"
                      onLoad={() => setHeroMediaLoaded(prev => ({ ...prev, [activeHeroStory]: true }))}
                      style={{ opacity: heroMediaLoaded[activeHeroStory] ? 1 : 0 }}
                    />
                    <div className="absolute top-4 left-0 w-full overflow-hidden pointer-events-none z-20">
                      <div className="inline-block whitespace-nowrap animate-marquee text-white/40 font-black text-sm tracking-widest">
                        <span className="mx-8 uppercase">Medrae</span>
                        <span className="mx-8 uppercase">Medrae</span>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-0 w-full overflow-hidden pointer-events-none z-20">
                      <div className="inline-block whitespace-nowrap animate-marquee text-white/40 font-bold text-[8px] tracking-[0.3em]">
                        <span className="mx-8 uppercase">Kenya Nursing Network</span>
                        <span className="mx-8 uppercase">Kenya Nursing Network</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-1 top-24 w-1 h-12 bg-slate-700 rounded-l-md" />
                  <div className="absolute -left-1 top-24 w-1 h-20 bg-slate-700 rounded-r-md" />
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </section>
      {/* ============================================================ */}
      {/* PREMIUM CTA SECTION - with scroll animations */}
      {/* ============================================================ */}
      <section id="cta">
        <AnimatedSection direction="up">
          <section className="relative py-16 md:py-24 px-0 md:px-6 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-blue-600 to-blue-800" />
            <div className="absolute top-0 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-white/10 rounded-full blur-[120px] -translate-y-1/2 animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-300/20 rounded-full blur-[80px] translate-y-1/2 animate-pulse" />

            <div className="max-w-7xl mx-auto relative z-10 px-4 md:px-0">
              <div className="flex flex-col lg:flex-row items-center gap-12 md:gap-16">
                {/* Text Content */}
                <div className="lg:w-1/2 text-center lg:text-left space-y-6 md:space-y-8">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/20 animate-pulse">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-blue-100">Final Step</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tighter">
                    Ready to Pass Your <br />
                    <span className="text-blue-200 italic">NURSING,FQEs and NCK Exams?</span>
                  </h2>
                  <p className="text-base md:text-lg lg:text-xl text-blue-50 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                    Stop scrolling through confusing PDFs. Join Medrae and train daily with
                    <span className="text-white font-bold"> instant explanations</span>,
                    unit-based drills, and simulations designed for clinical success.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 md:gap-4 pt-2 md:pt-4">
                    <Button
                      size="xl"
                      className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-black text-base md:text-lg shadow-2xl shadow-blue-900/20 transition-all active:scale-[0.98] group hover:scale-[1.05]"
                      onClick={() => navigate('/register')}
                    >
                      Get Started Now
                      <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-2 group-hover:scale-110" />
                    </Button>
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-blue-600 bg-slate-200 overflow-hidden hover:scale-110 transition-transform">
                          <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" />
                        </div>
                      ))}
                      <div className="h-9 md:h-10 px-2.5 md:px-3 rounded-full border-2 border-blue-600 bg-blue-500 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-white tracking-tighter hover:scale-110 transition-transform">
                        +2k Students
                      </div>
                    </div>
                  </div>
                </div>
                {/* Video Showcase Card */}
                <div className="lg:w-1/2 w-full flex justify-center lg:justify-end">
                  <div className="relative group w-full max-w-md">
                    <div className="absolute -inset-4 bg-white/5 rounded-[3rem] blur-xl group-hover:bg-blue-400/10 transition-colors" />
                    <div className="relative bg-slate-900 rounded-xl md:rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border-0 hover:scale-[1.02] transition-transform duration-500">
                      <video
                        className="w-full h-[250px] md:h-[350px] lg:h-[400px] object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        controls
                      >
                        <source src="/videos/Medrae2.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 p-3 md:p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 group-hover:bg-white/20 transition-all">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                        </div>
                        <div>
                          <p className="text-white text-[10px] md:text-xs font-black uppercase tracking-widest">Tutorial Preview</p>
                          <p className="text-blue-200 text-[9px] md:text-[10px] font-bold italic">See how the Medrae Engine works</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </section>

      {/* Footer - full width on mobile */}
      <footer
        id="contact"
        className="bg-slate-50 text-slate-900 border-t border-slate-200 pt-6 md:pt-8 pb-6 md:pb-8 px-0 md:px-4">
        <TooltipProvider>
          <div className="max-w-7xl mx-auto px-4 md:px-0">

            {/* ===== TERMS AGREEMENT NOTICE ===== */}
            <div className="mb-6 md:mb-8 p-4 md:p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <Shield className="h-5 w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm md:text-base font-semibold text-slate-800">
                      By using Medrae Nursing Platform, you agree to our:
                    </p>
                    <div className="flex flex-wrap gap-2 md:gap-3 mt-1.5">
                      <button
                        onClick={() => navigate("/terms")}
                        className="text-xs md:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        Terms & Conditions
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => navigate("/privacy")}
                        className="text-xs md:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        Privacy Policy
                      </button>
                      <span className="text-slate-300">•</span>
                      <button onClick={() => navigate("/cookies")}
                        className="text-xs md:text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                      >
                        Cookie Policy
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs md:text-sm font-medium text-slate-600">
                    Continued use = Acceptance
                  </span>
                </div>
              </div>
            </div>

            {/* Top Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-10 md:mb-16">
              {/* Brand Column */}
              <div className="md:col-span-4">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <img
                    src="/pwa-192x192.jpeg"
                    className="h-7 w-7 md:h-8 md:w-8 rounded-lg shadow-sm"
                    alt="Medrae Logo"
                  />
                  <span className="text-xl md:text-2xl font-bold text-red-500">Medrae</span><span className="text-xl md:text-2xl font-bold tracking-tight text-black">Nursing</span>
                </div>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-4 md:mb-6 max-w-sm">
                  Kenya's premier Nursing Network Platform. We empower students and professionals
                  through integrated learning, seamless collaboration, and clinical innovation.
                </p>
                <div className="flex gap-3 md:gap-4">
                  <Facebook className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors hover:scale-110" />
                  <Twitter className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors hover:scale-110" />
                  <Linkedin className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors hover:scale-110" />
                  <Instagram className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors hover:scale-110" />
                </div>
              </div>
              {/* Links Columns */}
              <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-8">
                {/* Platform */}
                <div>
                  <h3 className="font-bold text-xs md:text-sm uppercase tracking-wider mb-3 md:mb-4 text-slate-900">Platform</h3>
                  <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-600">
                    {["Feed", "Medrae Quizzes", "MedTube", "Forum", "Feed Page", "NursMartt", "institutional Exams", "Announcements"].map((item) => (
                      <li key={item}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer hover:text-blue-600 transition-colors hover:translate-x-1 inline-block">{item}</span>
                          </TooltipTrigger>
                          <TooltipContent>Login to access {item}</TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Learning */}
                <div>
                  <h3 className="font-bold text-xs md:text-sm uppercase tracking-wider mb-3 md:mb-4 text-slate-900">Learning</h3>
                  <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate -600">
                    {["Assessment Notes", "Quiz Units", "Live  classes", "KRCHN Curriculum", "My Mistakes", "Study Progress", "Challenges", "Simulation Mode", "Resources"].map((item) => (
                      <li key={item}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer hover:text-blue-600 transition-colors hover:translate-x-1 inline-block">{item}</span>
                          </TooltipTrigger>
                          <TooltipContent>Login to access {item}</TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Support */}
                <div>
                  <h3 className="font-bold text-xs md:text-sm uppercase tracking-wider mb-3 md:mb-4 text-slate-900">Support</h3>
                  <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-600">
                    {["Survival Hub", "Login", "Register", "Subscription", "Feedback", "Help Center", "GroupPay", "Settings"].map((item) => (
                      <li key={item}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer hover:text-blue-600 transition-colors hover:translate-x-1 inline-block">{item}</span>
                          </TooltipTrigger>
                          <TooltipContent>Login to access</TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {/* Middle Section: Regulatory Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-6 mb-8 md:mb-12">
              {[
                { title: "College & Licensing Prep", desc: "Structured support for college finals and NCK licensing exams. We align with Ministry of Health standards to ensure high-quality preparation.", link: "https://www.kmtc.ac.ke", linkText: "KMTC Resources" },
                { title: "NCK & Professional Guidance", desc: "Sample questions and exam tips tailored for the NCK licensing exam. Stay updated with regulatory policies and ethical standards in Kenya.", link: "https://www.nckenya.com", linkText: "NCK Official" },
                { title: "Global Mobility", desc: "Introducing NCLEX preparation and international licensing pathways for nurses aiming to expand their careers globally.", link: "https://www.ncsbn.org/nclex.htm", linkText: "NCLEX Info" }
              ].map((card, i) => (
                <div key={i} className={`bg-white p-4 md:p-6 md:rounded-2xl md:border md:border-slate-200 md:shadow-sm md:hover:shadow-md transition-shadow ${i < 2 ? 'border-b border-slate-100 md:border-b md:border-slate-200' : ''} hover:scale-[1.02] transition-all duration-300`}>
                  <h4 className="font-bold mb-2 md:mb-3 text-slate-900 text-sm md:text-base">{card.title}</h4>
                  <p className="text-[11px] md:text-xs leading-relaxed text-slate-600 mb-3 md:mb-4">
                    {card.desc}
                  </p>
                  <a href={card.link} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] md:text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:gap-2 transition-all">
                    {card.linkText} <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  </a>
                </div>
              ))}
            </div>
            {/* Bottom Section */}
            <div className="pt-6 md:pt-8 border-t border-slate-200 text-center">
              <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-500">
                <p>© {currentYear} Medrae Kenya. All rights reserved.</p>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Mail className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>Contact:</span>
                  <a href="mailto:medraenursing@gmail.com" className="text-slate-900 font-medium hover:underline text-xs md:text-sm">
                    medraenursing@gmail.com
                  </a>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                  <a
                    href="tel:0717517371"
                    className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 md:px-4 py-2 rounded-xl transition-colors text-xs md:text-sm font-medium"
                  >
                    <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    0717 517 371
                  </a>
                  <a
                    href="https://wa.me/254704473503"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between bg-white md:bg-white/10 md:hover:bg-white/20 md:border md:border-white/20 p-3 md:p-5 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] w-full md:w-auto hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-green-100 md:bg-white text-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
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
                <div className="flex gap-4 md:gap-6 text-[10px] md:text-xs font-medium">
                  <span
                    className="underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors font-bold"
                    onClick={() => navigate("/privacy")}
                  >
                    Privacy & Policy
                  </span>
                  <span
                    className="underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors font-bold"
                    onClick={() => navigate("/terms")}
                  >
                    Terms & Conditions
                  </span>
                </div>
              </div>

              <p className="mt-4 md:mt-6 text-[9px] md:text-[10px] text-slate-400 max-w-2xl mx-auto uppercase tracking-widest animate-pulse">
                Learn. Practice. Advance.
              </p>
            </div>
          </div>
        </TooltipProvider>
      </footer>
    </div>
  );
};

export default Index;