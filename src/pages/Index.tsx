import React from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play, Volume, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { supabase } from "@/lib/supabaseClient";

// ✅ Skeleton loader for hero cards (image/video replacement)
const HeroSkeleton = () => {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm animate-pulse">
      {/* media placeholder */}
      <div className="w-full h-[70%] bg-white/20" />

      {/* text lines */}
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-white/30 rounded" />
        <div className="h-4 w-1/2 bg-white/20 rounded" />
      </div>
    </div>
  );
};

const Index = () => {
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(true);


  const [ready, setReady] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);

  // ✅ track loading state PER hero slide
  const [heroMediaLoaded, setHeroMediaLoaded] = useState<Record<number, boolean>>({});


  const [activeHeroStory, setActiveHeroStory] = useState(0);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const studyAudioRef = useRef<HTMLAudioElement | null>(null);


  const [isMuted, setIsMuted] = useState(false); // always start unmuted
  const [isMobile, setIsMobile] = useState(false);
  const [welcomeAudioReady, setWelcomeAudioReady] = useState(false);
  const [studyAudioReady, setStudyAudioReady] = useState(false);

  // Add these states for media tracking
  const [totalMedia, setTotalMedia] = useState(0);
  const [loadedMedia, setLoadedMedia] = useState(0);
  const [allMediaReady, setAllMediaReady] = useState(false);
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
      ...heroStorySlides.flatMap(s => s.video ? [s.video] : [s.bg]),
      "/sounds/MedraeVoice.mp3",
      "/sounds/MedraeStudy.mp3",
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
      const mediaUrls = heroStorySlides.flatMap(slide => (slide.video ? [slide.video] : [slide.bg]));

      const loadPromises = mediaUrls.map(url => {
        return new Promise<void>((resolve) => {
          if (url.endsWith('.mp4')) {
            const video = document.createElement('video');
            video.src = url;
            video.onloadeddata = () => resolve();
            video.onerror = () => resolve(); // ignore errors to not block
          } else {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
      });

      await Promise.all(loadPromises);

      // mark all hero media as loaded
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
    // Initialize audios
    const welcomeAudio = new Audio("/sounds/MedraeVoice.mp3");
    welcomeAudio.volume = 1;
    welcomeAudio.loop = false;
    welcomeAudio.muted = true; // initially muted to allow preload
    welcomeAudio.preload = "auto";

    const studyAudio = new Audio("/sounds/MedraeStudy.mp3");
    studyAudio.volume = 0.3;
    studyAudio.loop = true;
    studyAudio.muted = true; // initially muted
    studyAudio.preload = "auto";

    // Assign to refs
    welcomeAudioRef.current = welcomeAudio;
    studyAudioRef.current = studyAudio;

    // Mark audios ready when can play through
    welcomeAudio.oncanplaythrough = () => setWelcomeAudioReady(true);
    studyAudio.oncanplaythrough = () => setStudyAudioReady(true);

    // Cleanup
    return () => {
      welcomeAudio.pause();
      studyAudio.pause();
      welcomeAudioRef.current = null;
      studyAudioRef.current = null;
    };
  }, []);



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
      bg: "/background8.jpg",
      text: (
        <div className="w-full h-full flex items-end justify-center text-center pb-3 md:pb-12 lg:pb-16">
          <div className="px-3 py-1 rounded-lg bg-white/5 backdrop-blur-none shadow-sm">
            <h1
              className="text-4xl md:text-6xl font-bold"
              style={{
                WebkitTextStroke: "0.5px blue",
                color: "rgb(24, 14, 158)",
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
          Medrae is built for serious NCK exam preparation. Practice 5,000+ updated NCK-style questions, get instant explanations after every answer, and focus directly on your weakest and most tested units.

        </h2>
      ),
    },

    {
      bg: "/indexbackground6.jpg",
      text: (
        <div className="flex flex-col gap-3 items-center">
          <Button
            size="lg"
            className="bg-blue-500 text-white font-bold text-lg md:text-2xl px-8 py-3 rounded-3xl shadow-lg hover:bg-blue-600 hover:scale-105 transition-all duration-300"
            onClick={() => navigate('/register')}
          >
            Create Account
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-yellow-500 text-blue-500 font-bold text-base md:text-lg px-8 py-3 rounded-3xl shadow-lg hover:bg-blue-500 hover:text-white hover:scale-105 transition-all duration-300"
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
          Kenya’s Structured NCK Exam Practice Platform

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


  // Simple mobile slider settings
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

  // inside your component
  const [spring, api] = useSpring(() => ({ x: 0 }));
  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], cancel, event }) => {
      // Only preventDefault if it's a touch or pointer event
      if (event?.type?.startsWith("touch") || event?.type?.startsWith("pointer")) {
        event.preventDefault();
      }

      // Move slide while dragging
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
      passive: false // ensures preventDefault works for actual drag events
    }
  );

  useEffect(() => {
    let scrolling = false; // prevent multiple triggers per swipe

    const handleWheel = (e: WheelEvent) => {
      if (scrolling) return; // already triggered for this swipe
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
        // horizontal swipe threshold
        if (e.deltaX > 0) {
          setActiveHeroStory(prev => Math.max(prev - 1, 0));
        } else {
          setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
        }
        scrolling = true;

        // Reset after short delay to allow next swipe
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
      description: "Tap an answer and immediately see why it’s correct or wrong. No guessing. No searching. Understand fast and lock it in."

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

    }
  ];


  if (!ready) return null;
  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      {showWelcomeOverlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-white rounded-3xl p-8 w-[90%] max-w-lg text-center space-y-6 shadow-2xl">
            {/* Logo */}
            <img
              src="/pwa-192x192.jpeg"
              alt="Medrae Logo"
              className="mx-auto h-16 w-16 rounded-lg"
            />

            {/* Welcome Message */}
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Welcome to MEDRAE!
            </h2>

            {/* Marketing Question */}
            <p className="text-lg text-gray-700 text-left">
              Ready to join Kenya’s No.1 Nursing Network and boost your skills, career, and confidence? Don’t miss this exclusive chance to connect with thousands of peers and professionals!
            </p>


            {/* Buttons */}
            {/* Buttons */}
            <div className="flex flex-col justify-center items-center gap-4 mt-4">
              <button
                className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-2xl transition-all ${!allMediaReady ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!allMediaReady}
                onClick={() => {
                  setShowWelcomeOverlay(false);

                  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

                  const playAudioSafely = (audio: HTMLAudioElement | null) => {
                    if (!audio) return;
                    audio.muted = false;
                    audio.currentTime = 0;
                    audio.play().catch(() => { console.warn("Audio blocked"); });
                  };

                  playAudioSafely(welcomeAudioRef.current);
                  playAudioSafely(studyAudioRef.current);
                }}
              >
                {allMediaReady ? "Yes, I want to join!" : "Downloading..."}
              </button>

              {/* Progress bar */}

              {/* Progress bar */}
              <div className="flex flex-col mt-4 w-full max-w-xs">
                {/* Percentage text */}
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Loading media
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {allMediaReady
                      ? "100%"
                      : `${Math.floor((loadedMedia / totalMedia) * 100)}%`}
                  </span>
                </div>

                {/* Bar background */}
                <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                  {/* Bar fill */}
                  <div
                    className="h-3 rounded-full transition-all duration-300"
                    style={{
                      width: allMediaReady
                        ? "100%"
                        : `${(loadedMedia / totalMedia) * 100}%`,
                      backgroundColor: allMediaReady
                        ? "green"
                        : loadedMedia / totalMedia <= 0.25
                          ? "red"
                          : loadedMedia / totalMedia <= 0.75
                            ? "blue"
                            : "yellow",
                    }}
                  />
                </div>

                {/* Count text */}
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Progress: {loadedMedia} / {totalMedia}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          minHeight: '80vh',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #051f58ff 100%)', // darker blue gradient
        }}
      >
        {/* Marquee background */}
        <div className="absolute w-full left-0 top-[70%] overflow-hidden z-5 pointer-events-none">

          <div className="absolute whitespace-nowrap animate-marquee text-[60px] md:text-[40px] lg:text-[50px] font-extrabold text-white/10 select-none pointer-events-none">
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
          </div>
        </div>
        <button
          className="absolute top-4 right-4 bg-black/30 text-white p-2 rounded-full z-30 hover:bg-black/50 transition"
          onClick={() => {
            setIsMuted(prev => {
              const newMuted = !prev;
              if (welcomeAudioRef.current) welcomeAudioRef.current.muted = newMuted;
              if (studyAudioRef.current) studyAudioRef.current.muted = newMuted;
              return newMuted;
            });
          }}
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume className="h-5 w-5" />}
        </button>


        {isMobile ? (
          <div className="flex flex-col gap-0">
            {heroStorySlides.map((slide, idx) => (
              <div
                key={idx}
                className="w-full bg-white rounded-none p-4 shadow-none border-none"
              >
                {typeof slide.text === "string"
                  ? <p className="text-gray-900 text-sm">{slide.text}</p>
                  : React.isValidElement(slide.text)
                    ? slide.text
                    : null}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop / Laptop view: keep current hero slides */}
            <animated.div
              {...bind()}
              style={{ touchAction: "pan-y pinch-zoom" }}

              className="relative w-full min-h-[70vh] flex justify-start items-center overflow-x-auto custom-scrollbar touch-pan-y select-none z-10"
            >
              {heroStorySlides.map((slide, idx) => {
                const offset = idx - activeHeroStory;
                const absOffset = Math.abs(offset);
                const scale = offset === 0 ? 1 : 0.85 ** absOffset;
                const gap = 15;
                const maxSlideWidth = 400;
                const slideWidth = Math.min(window.innerWidth * 0.9, maxSlideWidth);
                const zIndex = 100 - absOffset;

                return (
                  <div
                    key={idx}
                    className="absolute top-0 left-1/2 rounded-2xl shadow-lg transition-all duration-500 hover:scale-105 cursor-pointer select-none"
                    style={{
                      transform: `translate3d(${offset * (slideWidth + gap) + spring.x.get()}px, 0, 0) scale(${scale})`,
                      zIndex,
                      opacity: 1,
                      width: `${slideWidth}px`,
                      maxWidth: '100%',
                      height: '100%',
                    }}
                  >
                    <div className="relative w-full h-full">
                      {!heroMediaLoaded[idx] && (
                        <div className="absolute inset-0 z-10">
                          <HeroSkeleton />
                        </div>
                      )}
                      {slide.video ? (
                        <video
                          className="w-full h-full max-h-screen object-cover rounded-2xl transition-opacity duration-500"
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="auto"
                          onLoadedData={() =>
                            setHeroMediaLoaded(prev => ({ ...prev, [idx]: true }))
                          }
                          style={{ opacity: heroMediaLoaded[idx] ? 1 : 0 }}
                        >
                          <source src={slide.video} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img
                          src={slide.bg}
                          alt={`Slide ${idx + 1}`}
                          onLoad={() =>
                            setHeroMediaLoaded(prev => ({ ...prev, [idx]: true }))
                          }
                          className="w-full h-full max-h-screen object-cover rounded-3xl transition-opacity duration-500"
                          style={{ opacity: heroMediaLoaded[idx] ? 1 : 0 }}
                        />
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 text-white text-left space-y-2 text-base md:text-lg lg:text-xl">
                      {typeof slide.text === "string"
                        ? slide.text
                        : React.isValidElement(slide.text)
                          ? slide.text
                          : null}
                    </div>

                    {idx === activeHeroStory && (
                      <>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-2 md:p-3 lg:p-4"
                          onClick={() => {
                            setActiveHeroStory((prev) => Math.max(prev - 1, 0));
                            triggerAudioOnInteraction(); // ✅ play audio on click
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                          </svg>

                        </button>
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-2 md:p-3 lg:p-4"
                          onClick={() => {
                            setActiveHeroStory((prev) =>
                              Math.min(prev + 1, heroStorySlides.length - 1)
                            );
                            triggerAudioOnInteraction(); // ✅ play audio on click
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="size-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                          </svg>

                        </button>
                      </>
                    )}

                  </div>
                );
              })}
            </animated.div>
          </>
        )}
        {/* Pagination Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroStorySlides.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === activeHeroStory ? 'bg-white' : 'bg-white/40'
                }`}
            />
          ))}
        </div>

        {/* Bottom Marquee just below hero cards */}
        <div className="hidden md:block absolute w-full left-0 top-[70%] overflow-hidden z-5 pointer-events-none">


          <div className="whitespace-nowrap animate-marquee-reverse text-[60px] md:text-[40px] lg:text-[50px] font-extrabold text-white/10 select-none">
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
          </div>
        </div>

      </div>


      {/* Features Section */}
      <section className="py-20 px-3 bg-white text-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-xl mb-16">
            <h2 className="text-3xl md:text-4xl text-center font-bold mb-4">
              Everything You Need to Pass the NCK Exam

            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Stop wasting time searching through random PDFs. Medrae organizes NCK revision into structured units, instant-answer explanations, and smart performance analytics so you know exactly what to fix before exam day.

            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Special Video Card */}
            <div className="w-full my-8 flex justify-center">
              <div className="w-full max-w-md bg-gray-800  rounded-3xl shadow-lg overflow-hidden">
                <video
                  className="w-full h-[200px] md:h-[250px] lg:h-[300px] object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"      // ✅ preloads the entire video
                  controls
                >
                  <source src="/videos/Medrae1.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* First Feature Card */}
            <Card
              className="bg-white text-gray-900 border border-blue-400 hover:border-blue-600 transition-transform duration-300 shadow-sm hover:shadow-md rounded-3xl hover:scale-105 cursor-pointer"
              onClick={() => navigate('/register')}
            >
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-medical  rounded-3xl flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">{features[0].title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{features[0].description}</CardDescription>
              </CardContent>
            </Card>

            {/* Remaining Feature Cards */}
            {features.slice(1).map((feature, index) => {
              const IconComponent = feature.icon; // assign to capitalized variable
              return (
                <Card
                  key={index + 1}
                  className="bg-white text-gray-900 border border-blue-400 hover:border-blue-600 transition-transform duration-300 shadow-sm hover:shadow-md rounded-3xl hover:scale-105 cursor-pointer"
                  onClick={() => navigate('/register')}
                >
                  <CardHeader>
                    <div className="h-12 w-12 bg-gradient-medical  rounded-3xl flex items-center justify-center mb-4">
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision with Video Section */}
      <section className="py-16 px-1 bg-gradient-to-tr from-purple-100 to-pink-500">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10">

          {/* Text Side */}


          {/* Container */}
          <div className="lg:w-1/2 space-y-12 p-2 lg:p-10">

            {/* Mission */}
            <div>
              <h3 className="text-3xl lg:text-4xl font-extrabold mb-2 drop-shadow-xl flex items-center gap-3 transform transition-all duration-500 hover:scale-105 shine-text">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zM12 14v8m0 0h-3m3 0h3" />
                </svg>
                Our Mission
              </h3>
              <p className="text-gray-700 dark:text-gray-800">
                To eliminate random, unstructured revision and replace it with a focused NCK exam system that builds confidence through repeated, intelligent practice.

              </p>
            </div>

            {/* Vision */}
            <div>
              <h3 className="text-3xl lg:text-4xl font-extrabold mb-2 drop-shadow-xl flex items-center gap-3 transform transition-all duration-500 hover:scale-105 shine-text">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Our Vision
              </h3>
              <p className="text-gray-700 dark:text-gray-800">
                To become Kenya’s most trusted NCK exam preparation platform by helping students pass faster through structured, measurable, and performance-driven practice.

              </p>
            </div>

            {/* Slogan */}
            <div>
              <h3 className="text-3xl lg:text-4xl font-extrabold mb-2 drop-shadow-xl flex items-center gap-3 transform transition-all duration-500 hover:scale-105 shine-text">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Our Slogan
              </h3>
              <p className="text-gray-700 dark:text-gray-800 font-semibold">
                Stop Guessing. Start Passing.
              </p>
            </div>

          </div>
          {/* Video Side */}
          <div className="flex justify-center w-full">
            <div className="relative w-[220px] sm:w-[250px] md:w-[300px] lg:w-[350px] aspect-[9/16] rounded-3xl overflow-hidden shadow-lg">
              {/* Skeleton while loading */}
              {!heroMediaLoaded[activeHeroStory] && (
                <div className="absolute inset-0 z-10">
                  <HeroSkeleton />
                </div>
              )}

              {/* Video */}
              <video
                className="w-full h-full object-cover transition-opacity duration-500"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"      // ✅ preloads the entire video
                onLoadedData={() =>
                  setHeroMediaLoaded(prev => ({ ...prev, [activeHeroStory]: true }))
                }
                style={{ opacity: heroMediaLoaded[activeHeroStory] ? 1 : 0 }}
              >
                <source src="/videos/Medrae6.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Top Watermark */}
              <div className="absolute top-2 left-0 w-full overflow-hidden pointer-events-none z-20">
                <div className="inline-block whitespace-nowrap animate-marquee text-white/30 font-bold text-lg">
                  <span className="mx-8">MEDRAE</span>
                  <span className="mx-8">MEDRAE</span>
                  <span className="mx-8">MEDRAE</span>
                  <span className="mx-8">MEDRAE</span>
                </div>
              </div>

              {/* Bottom Watermark */}
              <div className="absolute bottom-2 left-0 w-full overflow-hidden pointer-events-none z-20">
                <div className="inline-block whitespace-nowrap animate-marquee text-white/30 font-bold text-sm">
                  <span className="mx-8">KENYA NURSING NETWORK PLATFORM</span>
                  <span className="mx-8">KENYA NURSING NETWORK PLATFORM</span>
                  <span className="mx-8">KENYA NURSING NETWORK PLATFORM</span>
                  <span className="mx-8">KENYA NURSING NETWORK PLATFORM</span>
                </div>
              </div>
            </div>
          </div>



        </div>
      </section >



      {/* CTA Section */}
      < section className="py-20 px-4 bg-gradient-to-tr from-blue-500 to-blue-200 text-gray-900" >
        <div className="max-w-4xl mx-auto text-xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            Ready to Pass Your NCK Exam?

          </h2>
          <p className="text-xl text-white mb-2">
            Stop scrolling through PDFs. Start practicing with structure. Join Medrae and train daily with instant explanations, unit-based drills, and exam-style simulations designed for NCK success.

          </p>

          <Button
            size="lg"
            className="bg-gradient-medical"
            onClick={() => navigate('/register')}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        {/* Special Video Card 2 */}
        <div className="w-full my-2 flex justify-center">
          <div className="w-full max-w-md bg-gray-800  rounded-3xl shadow-lg overflow-hidden">
            <video
              className="w-full h-[250px] md:h-[250px] lg:h-[300px] object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"      // ✅ preloads the entire video
              controls
            >
              <source src="/videos/Medrae2.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

      </section >
      <footer className="bg-white text-gray-900 border-t py-12 px-3">
        <TooltipProvider>
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <img src="/pwa-192x192.jpeg" className="h-7 w-7 rounded-3xl" alt="Medrae" />
                <span className="text-xl font-bold">Medrae</span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">
                Kenya’s Nursing Network Platform  empowering students and professionals through learning, collaboration, and innovation.We make sure you Learn. Practice. Advance.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h3 className="font-semibold mb-2">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {["Feed", "Medrae Quizzes", "MedTube", "Forum", "Announcements"].map((item) => (
                  <li key={item}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer hover:text-primary">{item}</span>
                      </TooltipTrigger>
                      <TooltipContent>Login to access</TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>

            {/* Learning Tools */}
            <div>
              <h3 className="font-semibold mb-2">Learning</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {["Assessment Notes", "Quiz Units", "Simulation Mode", "Calendar", "Study Progress", "Resources"].map((item) => (
                  <li key={item}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer hover:text-primary">{item}</span>
                      </TooltipTrigger>
                      <TooltipContent>Login to access</TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account & Support */}
            <div>
              <h3 className="font-semibold mb-2">Support</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {["Login", "Register", "Subscription", "Notifications", "Feedback", "Settings"].map((item) => (
                  <li key={item}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-pointer hover:text-primary">{item}</span>
                      </TooltipTrigger>
                      <TooltipContent>Login to access</TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Regulatory Info Section Below */}
          <div className="max-w-7xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* College & Licensing Prep */}
            <div className="p-2 bg-white text-gray-900 rounded-3xl shadow-sm">

              <h4 className="font-semibold mb-1 text-lg text-gray-900">
                College & Licensing Prep
              </h4>
              <p className="text-sm text-gray-700 mb-1">
                Medrae provides structured support for students completing their college final exams, including NCK licensing exams. The platform offers study materials, practice tests, and guidance to ensure students are well-prepared for their professional assessments.
              </p>
              <p className="text-sm text-gray-700 mb-2">
                Through interactive tutorials and exam simulations, users gain confidence in clinical skills, theoretical knowledge, and practical application. Medrae’s tools align with Ministry of Health standards and NCK regulations to ensure high-quality exam preparation.
              </p>
              <p className="text-sm text-gray-700">
                Learn more about your exam requirements and preparation tips via official resources: <a href="https://www.kmtc.ac.ke" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                  KMTC & Ministry Resources
                </a>
              </p>
            </div>

            {/* NCK Exam & Professional Guidance */}
            <div className="p-2 bg-white text-gray-900 rounded-3xl shadow-sm">

              <h4 className="font-semibold mb-1 text-gray-900">
                NCK Exam & Professional Guidance</h4>
              <p className="text-sm text-gray-700 mb-1">
                Medrae helps nurses and midwives prepare for the NCK licensing exam by providing sample questions, exam tips, and professional guidance. Users can track progress and focus on areas that require more attention.
              </p>
              <p className="text-sm text-gray-700 mb-1">
                The platform also explains regulatory policies in Kenya, including registration, licensing, and ethical standards, helping users comply with all statutory requirements.
              </p>
              <p className="text-sm text-gray-700">
                Access online resources for NCK exam updates and professional registration: <a href="https://www.nckenya.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                  NCK Official Website
                </a>
              </p>
            </div>

            {/* NCLEX Familiarity & Global Mobility */}
            <div className="p-2 bg-white text-gray-900 rounded-3xl shadow-sm">

              <h4 className="font-semibold mb-1 text-gray-900">
                NCLEX Familiarity & Global Mobility</h4>
              <p className="text-sm text-gray-700 mb-1">
                For users aiming to practice nursing internationally, Medrae introduces NCLEX exam content and preparation strategies. This includes practice questions, test-taking strategies, and guidance on international licensing requirements.
              </p>
              <p className="text-sm text-gray-700 mb-2">
                While focused on Kenyan regulations and licensing, the platform also supports nurses in understanding global pathways, enabling smoother transitions for work abroad.
              </p>
              <p className="text-sm text-gray-700">
                Learn more about NCLEX and international nursing licensure via official resources: <a href="https://www.ncsbn.org/nclex.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                  NCLEX Official Website
                </a>
              </p>
            </div>

          </div>

        </TooltipProvider>

        {/* Bottom */}
        <div className="mt-12 text-center text-sm text-gray-700 space-y-2">
          <p>© {new Date().getFullYear()} Medrae. All rights reserved.</p>
          <p>
            For inquiries, support, or partnership opportunities, please contact us at
            <a href="mailto:heartiqueofficial@gmail.com" className="text-blue-500 underline ml-1">
              heartiqueofficial@gmail.com
            </a>
          </p>
          <p>
            Medrae  Kenya’s Nursing Network Platform empowering students and professionals through learning, collaboration, and innovation.
          </p>
        </div>

      </footer>
    </div >
  );
};
export default Index;
