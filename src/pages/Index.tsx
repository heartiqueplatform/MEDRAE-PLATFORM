import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play, MessageSquare, LogOut, Volume, VolumeX, GraduationCap, CheckCircle2, Eye, Target, ExternalLink, Mail, Facebook, Linkedin, Instagram, Twitter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { supabase } from "@/lib/supabaseClient";
import HeroMobileCard from "@/components/HeroMobileCard";
import ExitOverlay from '@/components/ExitOverlay';

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

const Index = () => {
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(true);
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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

  const navigate = useNavigate();

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
            <h1
              className="text-4xl md:text-6xl font-bold"
              style={{
                WebkitTextStroke: "0.5px blue",
                color: "rgb(233, 0, 0)",
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-2 md:mb-2">
                <img
                  src="/pwa-192x192.jpeg"
                  alt="Medrae Logo"
                  className="h-12 w-12 md:h-16 md:w-16 rounded-sm object-contain"
                />
              </div>
              MEDRAE
            </h1>
          </div>
        </div>
      ),
    },
    {
      bg: "/indexbackground3.jpg",
      text: (
        <h2 className="text-sm md:text-xl font-semibold leading-snug text-gray-900 md:text-white">
          Medrae is built for serious NCK,FQEs exam preparation. Practice 5,000+ updated NCK-style questions, get instant explanations after every answer, and focus directly on your weakest and most tested units.
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
          Access the full NCK revision system—structured units, instant explanations, weak-topic tracking, and a growing bank of 5,000+ questions updated regularly to match exam trends.
        </h2>
      ),
    },
  ];

  const mobileSliderSettings = {
    dots: true,
    infinite: true,
    speed: 400,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 3000,
  };

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
    {
      icon: Brain,
      title: "Instant Answer Explanations",
      description: "Tap an answer and immediately see why it's correct or wrong. No guessing. No searching. Understand fast and lock it in."
    },
    {
      icon: Users,
      title: "Unit-Based Smart Revision",
      description: "Jump directly to your weakest or most tested NCK units. Focus where you lose marks and eliminate blind revision."
    },
    {
      icon: Star,
      title: "Failed Question Tracker",
      description: "Every question you fail is saved automatically. Revisit mistakes, reinforce weak areas, and convert weaknesses into guaranteed marks."
    },
    {
      icon: Play,
      title: "6,000+ Updated Questions",
      description: "Practice from a constantly growing question bank designed around real NCK patterns. Train with exam-relevant content—not outdated material."
    },
    {
      icon: GraduationCap,
      title: "For Tutors & Institutions",
      description: "Medrae offers affordable institutional online exam hosting powered by a secure DigiProctor system. Upload revision questions, CATs, assignments, mock exams, and internal assessments — all fully digitized, automatically tracked, and easy to manage. Save time on marking, go fully digital, and train your students to confidently sit any computer-based exam, including NCK, without fear."
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
    <div className="min-h-screen w-full overflow-x-hidden relative bg-slate-50">
      {/* FLOATING EXIT BUTTON */}
      <button
        onClick={handleExitApp}
        className="hidden md:flex fixed top-6 left-6 z-[9999]
             bg-white/10 backdrop-blur-md
             hover:bg-white/20 border border-white/20
             text-white/80 hover:text-white
             py-2 px-4 rounded-xl
             transition-all duration-300 active:scale-95
             items-center gap-2.5 group"
      >
        <LogOut className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:text-red-400 transition-all" />
        <span className="text-[11px] font-medium tracking-widest uppercase">
          Exit System
        </span>
      </button>

      <ExitOverlay
        isOpen={showExitOverlay}
        onExit={finalExitAction}
      />

      {/* Welcome Overlay - responsive */}
      {showWelcomeOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" />
          <div className="relative bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-10 w-full max-w-lg shadow-[0_32px_64px_-15px_rgba(0,0,0,0.3)] text-center space-y-6 md:space-y-8 animate-in zoom-in-95 slide-in-from-bottom-10 duration-700">

            {/* Logo & Title */}
            <div className="space-y-3 md:space-y-4">
              <div className="relative mx-auto w-16 h-16 md:w-20 md:h-20">
                <img
                  src="/pwa-192x192.jpeg"
                  alt="Medrae Logo"
                  className="mx-auto h-16 w-16 md:h-20 md:w-20 rounded-2xl shadow-xl border-4 border-white"
                />
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 border-4 border-white shadow-sm">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">
                  Welcome to <span className="text-red-600">MEDRAE </span> <span className="text-black">NURSING</span>
                </h2>
                <p className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest">
                  Kenya's No.1 Nursing Network
                </p>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="bg-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-6 text-left border border-slate-100 space-y-4">
              <p className="text-slate-600 leading-relaxed text-xs md:text-sm lg:text-base font-medium">
                Ready to boost your skills, career, and confidence? Before you proceed, please make sure you have read and understood our
                <span
                  className="mx-1 underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors font-bold"
                  onClick={() => navigate("/terms")}
                >
                  Terms & Conditions
                </span>
                <span
                  className="mx-1 underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-blue-600 hover:text-blue-800 transition-colors font-bold"
                  onClick={() => navigate("/privacy")}
                >
                  Privacy Policy
                </span>
                . Connect with thousands of peers and professionals today!
              </p>

              {/* Checkbox Agreement */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg border-2 border-slate-300 peer-checked:border-blue-600 peer-checked:bg-blue-600 flex items-center justify-center transition-all duration-200 group-hover:border-blue-400">
                    <svg
                      className="w-3 h-3 md:w-3.5 md:h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-[11px] md:text-xs text-slate-600 font-medium leading-relaxed">
                  I have read and agree to the{' '}
                  <span
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/terms");
                    }}
                  >
                    Terms & Conditions
                  </span>{' '}
                  and{' '}
                  <span
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/privacy");
                    }}
                  >
                    Privacy Policy
                  </span>
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4 md:gap-6">
              <div className="w-full space-y-3 md:space-y-4">
                <button
                  className={`w-full h-14 md:h-16 rounded-2xl font-black text-base md:text-lg transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 ${!allMediaReady || !agreedToTerms
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                    }`}
                  disabled={!allMediaReady || !agreedToTerms}
                  onClick={() => {
                    setShowWelcomeOverlay(false);
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    const notificationAudio = new Audio("/sounds/notification.mp3");
                    notificationAudio.volume = 1;
                    notificationAudio.loop = false;
                    notificationAudio.play().catch(() => console.warn("Audio blocked"));
                  }}
                >
                  {!allMediaReady ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                      Downloading Assets...
                    </span>
                  ) : !agreedToTerms ? (
                    <>
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                      Agree to Terms to Continue
                    </>
                  ) : (
                    <>
                      Yes, I agree! <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    </>
                  )}
                </button>
                <p className="text-slate-500 text-xs md:text-sm lg:text-base font-medium">
                  Already have an account?{" "}
                  <span
                    className="text-blue-600 font-black cursor-pointer hover:underline transition-all"
                    onClick={() => window.location.href = "/login"}
                  >
                    Log in here
                  </span>
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-sm space-y-2 md:space-y-3 pt-1 md:pt-2">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Media Initialization
                  </span>
                  <span className="text-xs md:text-sm font-black text-slate-700 tabular-nums">
                    {allMediaReady ? "100%" : `${Math.floor((loadedMedia / totalMedia) * 100)}%`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 md:h-3 overflow-hidden border border-slate-200/50 p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: allMediaReady ? "100%" : `${(loadedMedia / totalMedia) * 100}%`,
                      backgroundColor: allMediaReady
                        ? "#10b981"
                        : loadedMedia / totalMedia <= 0.25
                          ? "#f43f5e"
                          : loadedMedia / totalMedia <= 0.75
                            ? "#3b82f6"
                            : "#f59e0b",
                    }}
                  />
                </div>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter">
                  Synchronizing {loadedMedia} of {totalMedia} data points
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative w-full overflow-hidden min-h-[80vh] md:min-h-[85vh] bg-white md:bg-[linear-gradient(135deg,#1e3a8a_0%,#051f58_100%)]">

        {/* Marquee background */}
        <div className="absolute w-full left-0 top-[70%] overflow-hidden z-0 pointer-events-none opacity-20 md:opacity-10">
          <div className="absolute whitespace-nowrap animate-marquee text-[40px] md:text-[50px] lg:text-[70px] font-black text-slate-900 md:text-white select-none pointer-events-none tracking-tighter">
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
          </div>
        </div>

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

        {/* Hero Content */}
        {isMobile ? (
          <div className="relative z-10 px-0 pt-6 md:pt-8 pb-10 md:pb-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <HeroMobileCard />
          </div>
        ) : (
          <div className="relative w-full min-h-[75vh] flex flex-col justify-center items-center pt-10 pb-20">
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
                    className="absolute top-0 left-1/2 rounded-[2.5rem] border-2 border-white shadow-2xl transition-all duration-700 ease-out cursor-pointer select-none overflow-hidden group"
                    style={{
                      transform: `translate3d(${offset * (slideWidth + gap) + spring.x.get()}px, 0, 0) scale(${scale})`,
                      zIndex,
                      opacity: absOffset > 2 ? 0 : 1,
                      width: `${slideWidth}px`,
                      height: '100%',
                    }}
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
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </animated.div>
            <div className="mt-12 flex gap-3 z-20">
              {heroStorySlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveHeroStory(idx)}
                  className={`transition-all duration-500 rounded-full h-2.5 ${idx === activeHeroStory
                    ? 'w-10 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]'
                    : 'w-2.5 bg-white/30 hover:bg-white/50'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom Marquee */}
        <div className="hidden md:block absolute w-full left-0 bottom-10 overflow-hidden z-0 pointer-events-none select-none opacity-10">
          <div className="whitespace-nowrap animate-marquee-reverse text-[60px] md:text-[50px] lg:text-[70px] font-black text-white tracking-tighter">
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
            <span className="mx-16">MEDRAE NURSING KENYA NETWORK</span>
          </div>
        </div>
      </div>

      {/* Features Section - full width on mobile */}
      <section className="py-16 md:py-24 px-0 md:px-4 bg-white text-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
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

          {/* Features Grid - single column on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 md:gap-6 px-0 md:px-0">

            {/* Special Video Card */}
            <div className="lg:col-span-1 group relative border-b border-slate-100 md:border-b-0">
              <div className="h-full min-h-[280px] md:min-h-[300px] bg-slate-900 md:rounded-[2.5rem] shadow-2xl overflow-hidden md:border-4 md:border-white md:ring-1 md:ring-slate-100">
                <video
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  controls
                >
                  <source src="/videos/Medrae1.mp4" type="video/mp4" />
                </video>
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold text-white uppercase tracking-widest">
                  Platform Demo
                </div>
              </div>
            </div>

            {/* First Feature Card */}
            <Card
              className="bg-slate-50/50 hover:bg-white border-none md:rounded-[2.5rem] md:shadow-sm md:hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:hover:-translate-y-2 transition-all duration-500 cursor-pointer p-2 group rounded-none shadow-none border-b border-slate-100 md:border-b-0"
              onClick={() => navigate('/register')}
            >
              <CardHeader className="pt-6 md:pt-8">
                <div className="h-12 w-12 md:h-14 md:w-14 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-blue-100 group-hover:rotate-6 transition-transform">
                  <Brain className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <CardTitle className="text-lg md:text-xl font-bold tracking-tight text-slate-800">{features[0].title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-500 font-medium leading-relaxed text-sm">
                  {features[0].description}
                </CardDescription>
              </CardContent>
            </Card>

            {/* Remaining Feature Cards */}
            {features.slice(1).map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={index + 1}
                  className="bg-slate-50/50 hover:bg-white border-none md:rounded-[2.5rem] md:shadow-sm md:hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] md:hover:-translate-y-2 transition-all duration-500 cursor-pointer p-2 group rounded-none shadow-none border-b border-slate-100 md:border-b-0"
                  onClick={() => navigate('/register')}
                >
                  <CardHeader className="pt-6 md:pt-8">
                    <div className="h-12 w-12 md:h-14 md:w-14 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-lg shadow-blue-100 group-hover:rotate-6 transition-transform">
                      <IconComponent className="h-6 w-6 md:h-7 md:w-7 text-white" />
                    </div>
                    <CardTitle className="text-lg md:text-xl font-bold tracking-tight text-slate-800">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-500 font-medium leading-relaxed text-sm text-balance">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision Section - full width on mobile */}
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
              <div className="space-y-3 md:space-y-4 group">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-500">
                    <Target className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800">Our Mission</h3>
                </div>
                <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                  To eliminate random, unstructured revision and replace it with a focused NCK exam system that builds confidence through repeated, intelligent practice <span className="text-2xl font-bold tracking-tight text-black">(I.P)</span>.
                </p>
              </div>
              {/* Vision Item */}
              <div className="space-y-3 md:space-y-4 group">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                    <Eye className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-800">Our Vision</h3>
                </div>
                <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                  To become Kenya's most trusted NCK, FQEs exams preparation platform by helping students pass faster through structured, measurable, and performance-driven practice <span className="text-2xl font-bold tracking-tight text-black">(P.D.P)</span>.
                </p>
              </div>
              {/* Slogan Item */}
              <div className="md:col-span-2 p-5 md:p-8 bg-white/60 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-4 md:gap-6 group hover:border-purple-200 transition-colors">
                <div className="p-3 md:p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-purple-200">
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
            <div className="relative w-[240px] md:w-[280px] lg:w-[320px] aspect-[9/18.5] rounded-[2.5rem] md:rounded-[3rem] p-2.5 md:p-3 bg-slate-800 shadow-2xl ring-4 ring-slate-100 ring-offset-4 ring-offset-slate-50">
              <div className="w-full h-full relative rounded-[2rem] md:rounded-[2.2rem] overflow-hidden bg-slate-100">
                {!heroMediaLoaded[activeHeroStory] && (
                  <div className="absolute inset-0 z-10">
                    <HeroSkeleton />
                  </div>
                )}
                <img
                  src="high5.png"
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

      {/* Premium CTA Section - full width on mobile */}
      <section className="relative py-16 md:py-24 px-0 md:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-blue-600 to-blue-800" />
        <div className="absolute top-0 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-white/10 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-300/20 rounded-full blur-[80px] translate-y-1/2" />

        <div className="max-w-7xl mx-auto relative z-10 px-4 md:px-0">
          <div className="flex flex-col lg:flex-row items-center gap-12 md:gap-16">
            {/* Text Content */}
            <div className="lg:w-1/2 text-center lg:text-left space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/20">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-blue-100">Final Step</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white leading-[1.1] tracking-tighter">
                Ready to Pass Your <br />
                <span className="text-blue-200 italic">NCK Exam?</span>
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-blue-50 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                Stop scrolling through confusing PDFs. Join Medrae and train daily with
                <span className="text-white font-bold"> instant explanations</span>,
                unit-based drills, and simulations designed for clinical success.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 md:gap-4 pt-2 md:pt-4">
                <Button
                  size="xl"
                  className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-black text-base md:text-lg shadow-2xl shadow-blue-900/20 transition-all active:scale-[0.98] group"
                  onClick={() => navigate('/register')}
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-1" />
                </Button>
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-blue-600 bg-slate-200 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" />
                    </div>
                  ))}
                  <div className="h-9 md:h-10 px-2.5 md:px-3 rounded-full border-2 border-blue-600 bg-blue-500 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-white tracking-tighter">
                    +2k Students
                  </div>
                </div>
              </div>
            </div>
            {/* Video Showcase Card */}
            <div className="lg:w-1/2 w-full flex justify-center lg:justify-end">
              <div className="relative group w-full max-w-md">
                <div className="absolute -inset-4 bg-white/5 rounded-[3rem] blur-xl group-hover:bg-blue-400/10 transition-colors" />
                <div className="relative bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border-2 border-white/10 ring-1 ring-white/20">
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
                  <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 p-3 md:p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
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

      {/* Footer - full width on mobile */}
      <footer className="bg-slate-50 text-slate-900 border-t border-slate-200 pt-12 md:pt-16 pb-6 md:pb-8 px-0 md:px-4">
        <TooltipProvider>
          <div className="max-w-7xl mx-auto px-4 md:px-0">
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
                  <Facebook className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors" />
                  <Twitter className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors" />
                  <Linkedin className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors" />
                  <Instagram className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-primary cursor-pointer transition-colors" />
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
                            <span className="cursor-pointer hover:text-blue-600 transition-colors">{item}</span>
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
                  <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-600">
                    {["Assessment Notes", "Quiz Units", "My Mistakes", "Study Progress", "Challenges", "Simulation Mode", "Resources"].map((item) => (
                      <li key={item}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer hover:text-blue-600 transition-colors">{item}</span>
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
                    {["Survival Hub", "Login", "Register", "Subscription", "Feedback", "Settings"].map((item) => (
                      <li key={item}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-pointer hover:text-blue-600 transition-colors">{item}</span>
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
                <div key={i} className={`bg-white p-4 md:p-6 md:rounded-2xl md:border md:border-slate-200 md:shadow-sm md:hover:shadow-md transition-shadow ${i < 2 ? 'border-b border-slate-100 md:border-b md:border-slate-200' : ''}`}>
                  <h4 className="font-bold mb-2 md:mb-3 text-slate-900 text-sm md:text-base">{card.title}</h4>
                  <p className="text-[11px] md:text-xs leading-relaxed text-slate-600 mb-3 md:mb-4">
                    {card.desc}
                  </p>
                  <a href={card.link} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] md:text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
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
                <a
                  href="https://wa.me/254704473503"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between bg-white md:bg-white/10 md:hover:bg-white/20 md:border md:border-white/20 p-3 md:p-5 rounded-xl md:rounded-2xl transition-all active:scale-[0.98] w-full md:w-auto"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-green-100 md:bg-white text-green-600 flex items-center justify-center shadow-lg">
                      <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70 mb-0.5">WhatsApp Support</p>
                      <p className="text-xs md:text-sm lg:text-base font-bold">0704 473 503</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
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
              <p className="mt-4 md:mt-6 text-[9px] md:text-[10px] text-slate-400 max-w-2xl mx-auto uppercase tracking-widest">
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