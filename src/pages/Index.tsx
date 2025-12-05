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


const Index = () => {
  const [ready, setReady] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);

  const [activeHeroStory, setActiveHeroStory] = useState(0);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const studyAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isMuted, setIsMuted] = useState(false); // always start unmuted



  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
    welcomeAudioRef.current = new Audio("/sounds/MedraeVoice.mp3");
    welcomeAudioRef.current.volume = 1;
    welcomeAudioRef.current.muted = true; // start muted

    studyAudioRef.current = new Audio("/sounds/MedraeStudy.mp3");
    studyAudioRef.current.volume = 0.3;
    studyAudioRef.current.loop = true;
    studyAudioRef.current.muted = true; // start muted

    let replayTimeout: NodeJS.Timeout;

    const playVoice = async () => {
      if (!welcomeAudioRef.current) return;
      welcomeAudioRef.current.currentTime = 0;
      try {
        await welcomeAudioRef.current.play();
      } catch {
        const resumeOnInteraction = () => {
          welcomeAudioRef.current?.play().catch(() => { });
          window.removeEventListener("click", resumeOnInteraction);
          window.removeEventListener("keydown", resumeOnInteraction);
        };
        window.addEventListener("click", resumeOnInteraction);
        window.addEventListener("keydown", resumeOnInteraction);
      }
    };

    const playStudy = async () => {
      if (!studyAudioRef.current) return;
      try {
        await studyAudioRef.current.play();
      } catch {
        const resumeOnInteraction = () => {
          studyAudioRef.current?.play().catch(() => { });
          window.removeEventListener("click", resumeOnInteraction);
          window.removeEventListener("keydown", resumeOnInteraction);
        };
        window.addEventListener("click", resumeOnInteraction);
        window.addEventListener("keydown", resumeOnInteraction);
      }
    };

    // Voice ended → replay after 30s
    const handleVoiceEnd = () => {
      replayTimeout = setTimeout(() => {
        playVoice();
      }, 30000);
    };
    welcomeAudioRef.current.addEventListener("ended", handleVoiceEnd);

    // Scroll/drag trigger
    const handleUserScroll = () => {
      if (welcomeAudioRef.current && studyAudioRef.current) {
        welcomeAudioRef.current.muted = false;
        studyAudioRef.current.muted = false;
        playStudy();
        playVoice();
        // Remove listener after first trigger
        window.removeEventListener("scroll", handleUserScroll);
        window.removeEventListener("wheel", handleUserScroll);
        window.removeEventListener("touchmove", handleUserScroll);
      }
    };

    window.addEventListener("scroll", handleUserScroll, { passive: true });
    window.addEventListener("wheel", handleUserScroll, { passive: true });
    window.addEventListener("touchmove", handleUserScroll, { passive: true });

    return () => {
      welcomeAudioRef.current?.pause();
      studyAudioRef.current?.pause();
      welcomeAudioRef.current?.removeEventListener("ended", handleVoiceEnd);
      clearTimeout(replayTimeout);
      welcomeAudioRef.current = null;
      studyAudioRef.current = null;

      window.removeEventListener("scroll", handleUserScroll);
      window.removeEventListener("wheel", handleUserScroll);
      window.removeEventListener("touchmove", handleUserScroll);
    };
  }, [isMuted]);


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
      video: "/videos/Medrae4.mp4",
      text: (
        <div className="w-full h-full flex items-end justify-center text-center pb-6 md:pb-12 lg:pb-16">
          <div className="px-3 py-1 rounded-lg bg-white/05 backdrop-blur-sm shadow-sm">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-wide text-blue-700">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img
                  src="/pwa-192x192.jpeg"
                  alt="Medrae Logo"
                  className="h-6 w-6 rounded-sm object-contain"
                />
                <span className="text-xl font-bold"></span>
              </div>
              MEDRAE
            </h1>
          </div>
        </div>
      ),
    },
    {
      video: "/videos/Medrae5.mp4",
      text: "Kenya’s Nursing Network Platform",
    },

    {
      bg: "", // keep empty so the video replaces the background
      text: "Medrae is a professional platform for Nursing education, clinical training, and healthcare career advancement. Explore verified question banks, case-based scenarios, and evidence-driven study materials tailored for healthcare excellence.",
      video: "/videos/Medrae2.mp4", // new property for the video
    },

    {
      bg: "/indexbackground6.jpg",
      text: (
        <div className="flex flex-col gap-4">
          <Button
            size="lg"
            className="bg-white text-primary transition-all duration-300 hover:bg-blue-600 hover:text-white"

            onClick={() => navigate('/register')}
          >
            Join Medrae
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white text-primary hover:bg-white/10"
            onClick={() => navigate('/login')}
          >
            Sign In to Continue
          </Button>
        </div>
      ),
    },

    {
      video: "/videos/Medrae3.mp4",
      text: "Strengthen your skills through simulations, certification modules, and structured progression tracking.\n\nFor the best experience, access Medrae via desktop for enhanced clarity and performance, or use mobile for flexible learning anywhere.",
    },

    {
      video: "/videos/Medrae6.mp4",
      text: "All plans include full feature access—choose Pro at KSh 99/month or Premium at KSh 450/year. The first 1,000 users receive a free 6-month professional trial to experience Medrae’s complete suite of educational and career tools.",
    },


  ];


  // inside your component
  const [spring, api] = useSpring(() => ({ x: 0 }));
  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], cancel, event }) => {
      event.preventDefault(); // prevent scroll/selection

      // Move slide while dragging
      api.start({ x: mx });

      // On release, decide if we change slide
      if (!down) {
        if (mx < -100) {
          // dragged left → next slide
          setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
        } else if (mx > 100) {
          // dragged right → previous slide
          setActiveHeroStory(prev => Math.max(prev - 1, 0));
        }

        // reset spring position
        api.start({ x: 0 });
      }
    },
    {
      axis: "x",
      filterTaps: true,
      pointer: { touch: true, mouse: true }, // enable both
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
      title: "AI Clinical Assistant",
      description: "Receive precise guidance on medical concepts, drug information, and evidence-based practices. Medrae AI enhances your understanding and supports critical decision-making in real time."
    },
    {
      icon: Users,
      title: "Professional Collaboration",
      description: "Engage with healthcare professionals and students, join specialty discussions, and share clinical insights to expand your medical expertise and professional network."
    },
    {
      icon: Star,
      title: "Performance Analytics",
      description: "Track your educational and clinical progress through data-driven insights. Identify your strengths, improve your focus areas, and achieve measurable growth in your professional development."
    },
    {
      icon: Play,
      title: "Video Learning & Continuous Updates",
      description: "Access expert-led videos, clinical demonstrations, and updated educational content. Stay current with medical trends and maintain consistent professional growth."
    }
  ];


  if (!ready) return null;


  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      {/* Hero Section */}
      {/* Hero Section */}
      {/* Hero Section */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          minHeight: '80vh',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #051f58ff 100%)', // darker blue gradient
        }}
      >
        {/* Marquee background */}
        <div className="absolute inset-0 overflow-hidden">
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


        {/* Hero slides container */}
        <animated.div
          {...bind()}
          style={{ touchAction: "pan-y pinch-zoom" }}

          className="relative w-full min-h-screen md:h-[70vh] lg:h-[80vh] flex justify-center items-center overflow-hidden touch-pan-y select-none z-10"
        >
          {heroStorySlides.map((slide, idx) => {
            const offset = idx - activeHeroStory;
            const absOffset = Math.abs(offset);
            const scale = offset === 0 ? 1 : 0.85 ** absOffset;
            const spacing = 15;
            const translateX = offset * spacing;
            const zIndex = 100 - absOffset;

            return (
              <div
                key={idx}
                className="absolute top-0 left-1/2 rounded-xl shadow-lg transition-all duration-500 hover:scale-105 cursor-pointer select-none"
                style={{
                  transform: `translateX(calc(-50% + ${translateX}vw + ${spring.x.get()}px)) scale(${scale})`,
                  zIndex,
                  opacity: 1, // fully opaque
                  width: `${scale * 90}%`,
                  maxWidth: "400px",
                }}
              >
                {slide.video ? (
                  <video
                    className="w-full h-full max-h-screen object-cover rounded-xl"
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src={slide.video} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img
                    src={slide.bg}
                    alt={`Slide ${idx + 1}`}
                    className="w-full h-full max-h-screen object-cover rounded-xl"
                  />
                )}
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
                      onClick={() => setActiveHeroStory((prev) => Math.max(prev - 1, 0))}
                    >
                      &#60;
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full p-2 md:p-3 lg:p-4"
                      onClick={() =>
                        setActiveHeroStory((prev) =>
                          Math.min(prev + 1, heroStorySlides.length - 1)
                        )
                      }
                    >
                      &#62;
                    </button>
                  </>
                )}
              </div>
            );
          })}

        </animated.div>
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
        <div className="absolute w-full left-0 top-[70%] overflow-hidden z-5 pointer-events-none">

          <div className="whitespace-nowrap animate-marquee-reverse text-[60px] md:text-[40px] lg:text-[50px] font-extrabold text-white/10 select-none">
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
            <span className="mx-16">MEDRAE KENYA NURSING NETWORK</span>
          </div>
        </div>

      </div>


      {/* Features Section */}
      <section className="py-20 px-4 bg-white text-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Innovative Tools for Nursing Excellence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Medrae integrates modern technology with evidence-based education. Access structured medical content, detailed progress analytics, and interactive video lessons—all designed to support continuous professional growth and mastery in healthcare practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Special Video Card */}
            <div className="w-full my-8 flex justify-center">
              <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <video
                  className="w-full h-[200px] md:h-[250px] lg:h-[300px] object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                >
                  <source src="/videos/Medrae1.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* First Feature Card */}
            <Card
              className="border border-blue-400 hover:border-blue-600 transition-transform duration-300 shadow-sm hover:shadow-md rounded-lg hover:scale-105 cursor-pointer"
              onClick={() => navigate('/register')}
            >
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-medical rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">{features[0].title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{features[0].description}</CardDescription>
              </CardContent>
            </Card>
            {/* Remaining Feature Cards */}
            {/* Remaining Feature Cards */}
            {features.slice(1).map((feature, index) => {
              const IconComponent = feature.icon; // assign to capitalized variable
              return (
                <Card
                  key={index + 1}
                  className="border border-blue-400 hover:border-blue-600 transition-transform duration-300 shadow-sm hover:shadow-md rounded-lg hover:scale-105 cursor-pointer"
                  onClick={() => navigate('/register')}
                >
                  <CardHeader>
                    <div className="h-12 w-12 bg-gradient-medical rounded-lg flex items-center justify-center mb-4">
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
      <section className="py-16 px-4 bg-gradient-to-tr from-purple-100 to-pink-500">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10">

          {/* Text Side */}


          {/* Container */}
          <div className="lg:w-1/2 space-y-12 p-6 lg:p-10">

            {/* Mission */}
            <div>
              <h3 className="text-3xl lg:text-4xl font-extrabold mb-3 drop-shadow-xl flex items-center gap-3 transform transition-all duration-500 hover:scale-105 shine-text">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3zM12 14v8m0 0h-3m3 0h3" />
                </svg>
                Our Mission
              </h3>
              <p className="text-gray-700 dark:text-gray-800">
                To simplify learning for healthcare students by offering organized materials, key resources, and guidance for exams and assessments, turning preparation into confidence.
              </p>
            </div>

            {/* Vision */}
            <div>
              <h3 className="text-3xl lg:text-4xl font-extrabold mb-3 drop-shadow-xl flex items-center gap-3 transform transition-all duration-500 hover:scale-105 shine-text">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Our Vision
              </h3>
              <p className="text-gray-700 dark:text-gray-800">
                To become Kenya’s leading platform for nursing students, bridging the gap between students and professional nurses, making learning interactive, engaging, and enjoyable, while connecting education to real-world nursing practice.
              </p>
            </div>

            {/* Slogan */}
            <div>
              <h3 className="text-3xl lg:text-4xl font-extrabold mb-3 drop-shadow-xl flex items-center gap-3 transform transition-all duration-500 hover:scale-105 shine-text">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Our Slogan
              </h3>
              <p className="text-gray-700 dark:text-gray-800 font-semibold">
                Organized Learning. Confident Exams.
              </p>
            </div>

          </div>
          {/* Video Side */}
          <div className="lg:w-1/2 w-full flex justify-center">
            <div className="w-full max-w-lg bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <video
                className="w-full h-[250px] md:h-[300px] lg:h-[400px] object-cover rounded-lg"
                autoPlay
                muted
                loop
                playsInline
                controls
              >
                <source src="/videos/Medrae7.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

        </div>
      </section >



      {/* CTA Section */}
      < section className="py-20 px-4 bg-gradient-to-tr from-blue-500 to-blue-200 text-gray-900" >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Elevate Your Nursing Career with Medrae
          </h2>
          <p className="text-xl text-white mb-8">
            Medrae unites learners and professionals in one advanced medical ecosystem. Harness AI-driven insights, structured clinical learning, and collaborative tools to transform how you study, train, and grow in healthcare.
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
        <div className="w-full my-8 flex justify-center">
          <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <video
              className="w-full h-[200px] md:h-[250px] lg:h-[300px] object-cover"
              autoPlay
              muted
              loop
              playsInline
              controls
            >
              <source src="/videos/Medrae2.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

      </section >
      <footer className="bg-card border-t py-12 px-6">
        <TooltipProvider>
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/pwa-192x192.jpeg" className="h-7 w-7 rounded-sm" alt="Medrae" />
                <span className="text-xl font-bold">Medrae</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kenya’s Nursing Network Platform  empowering students and professionals through learning, collaboration, and innovation.We make sure you Learn. Practice. Advance.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h3 className="font-semibold mb-3">Platform</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Feed", "Medrae Quizzes", "MedTube", "Reels", "Forum", "Announcements"].map((item) => (
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
              <h3 className="font-semibold mb-3">Learning</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
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
              <h3 className="font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
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

            {/* KMT / College Info */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
              <h4 className="font-semibold mb-2 text-lg text-gray-900 dark:text-gray-100">
                KMT / College Info
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Kenya Medical Training College (KMTC) is a national institution for healthcare training with campuses across Kenya. It offers diploma, certificate, and higher diploma programs in nursing, clinical medicine, laboratory sciences, pharmacy, and other allied health courses. KMTC aims to produce competent healthcare professionals who serve both public and private sectors.
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                Students are provided with both theoretical and practical clinical skills training, including access to clinical placements in hospitals and community health facilities. Programs are regulated by the Ministry of Health and relevant professional boards to ensure high standards.
              </p>
              <p className="text-sm text-muted-foreground">
                For more info, visit: <a href="https://www.kmtc.ac.ke" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                  KMTC Official Website
                </a>
              </p>
            </div>


            {/* NCK Info */}
            <div>
              <h4 className="font-semibold mb-2">About NCK</h4>
              <p className="text-sm text-muted-foreground">
                The Nursing Council of Kenya (NCK) is the statutory regulatory body for nursing and midwifery in Kenya, established under the Nurses and Midwives Act Cap 257.
              </p>
              <p className="text-sm text-muted-foreground">
                NCK’s mandate includes accreditation of training institutions, regulation of nursing and midwifery education, licensing and registration of practising nurses and midwives, conducting licensure examinations, enforcing professional and ethical standards, and ensuring quality healthcare through well‑trained professionals.
              </p>
              <p className="text-sm text-muted-foreground">
                NCK also provides an online services portal for licensing, registration, retention, CPD, and other regulatory services, making it easier for nurses to manage their professional credentials.
              </p>
            </div>

            {/* NCLEX Info */}
            <div>
              <h4 className="font-semibold mb-2">About NCLEX</h4>
              <p className="text-sm text-muted-foreground">
                NCLEX stands for the National Council Licensure Examination, a standardized, computer‑adaptive exam required to obtain nursing licensure in the United States and Canada.
              </p>
              <p className="text-sm text-muted-foreground">
                There are different NCLEX exam types depending on the level of nursing practice (e.g. RN, PN), and passing NCLEX is a prerequisite for nurses trained internationally who wish to practice in the U.S.
              </p>
              <p className="text-sm text-muted-foreground">
                Including mention of NCK shows compliance with Kenyan regulations, while mentioning NCLEX acknowledges the global mobility aspirations of Kenyan nurses. This demonstrates that Medrae is aware of both local regulation and international licensure pathways.
              </p>
            </div>

          </div>

        </TooltipProvider>

        {/* Bottom */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Medrae. All rights reserved.
        </div>
      </footer>

    </div >
  );
};
export default Index;
