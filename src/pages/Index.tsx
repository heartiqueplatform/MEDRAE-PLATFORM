import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { supabase } from "@/lib/supabaseClient";


const Index = () => {
  const [loading, setLoading] = useState(true);
const [activeHeroStory, setActiveHeroStory] = useState(0);



  const navigate = useNavigate();


  const heroStorySlides = [
  {
    bg: "/indexbackground1.jpg",
   text: (
  <div className="w-full h-full flex items-center justify-center text-center">
<div className="px-6 py-4 rounded-xl bg-white/40 backdrop-blur-sm shadow-2xl">

  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-wide text-blue-700">
    Medrae Medical Network Platform V1.0
  </h1>
</div>

  </div>
),

  },
  {
    bg: "/indexbackground2.jpg",
    text: "MEDRAE MEDICAL\nNETWORK\nPlatform",
  },
  {
    bg: "/indexbackground3.jpg",
    text: "Medrae is a professional platform for medical education, clinical training, and healthcare career advancement. Explore verified question banks, case-based scenarios, and evidence-driven study materials tailored for healthcare excellence.",
  },
  {
    bg: "/indexbackground4.jpg",
    text: "Strengthen your skills through simulations, certification modules, and structured progression tracking.\n\nFor the best experience, access Medrae via desktop for enhanced clarity and performance, or use mobile for flexible learning anywhere.",
  },
  {
    bg: "/indexbackground5.jpg",
    text: "All plans include full feature access—choose Pro at KSh 99/month or Premium at KSh 450/year. The first 1,000 users receive a free 6-month professional trial to experience Medrae’s complete suite of educational and career tools.",
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
];


  // inside your component
const [spring, api] = useSpring(() => ({ x: 0 }));

const bind = useDrag(({ down, movement: [mx], direction: [xDir] }) => {
  if (!down && Math.abs(mx) > 50) {
    if (xDir < 0) setActiveHeroStory(prev => Math.min(prev + 1, heroStorySlides.length - 1));
    else setActiveHeroStory(prev => Math.max(prev - 1, 0));
  }
  api.start({ x: down ? mx : 0 });
});
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        navigate("/redirect", { replace: true });
      } else {
        const hasLoggedInBefore = localStorage.getItem("hasLoggedInBefore");
        const userRole = localStorage.getItem("userRole");
      }

      setLoading(false);
    };

    checkSession();
  }, [navigate]);

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


  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
{/* Hero Section */}
{/* Hero Section */}
<div
  className="relative w-full overflow-hidden"
  style={{
    minHeight: '80vh',
background: 'linear-gradient(135deg, hsl(220, 60%, 35%) 0%, hsl(220, 60%, 25%) 100%)'
 // blue gradient
  }}
>
<div className="relative w-full min-h-screen md:h-[70vh] lg:h-[80vh] flex justify-center items-center">

    {heroStorySlides.map((slide, idx) => {
      const offset = idx - activeHeroStory;
      const absOffset = Math.abs(offset);
      const scale = offset === 0 ? 1 : 0.85 ** absOffset;
      const spacing = 15;
      const translateX = offset * spacing;
      const rotate = offset === 0 ? 0 : offset * 3;
      const zIndex = 100 - absOffset;
      const opacity = offset === 0 ? 1 : 0.6;

      return (
        <div
          key={idx}
          className="absolute top-0 left-1/2 rounded-xl shadow-lg transition-all duration-500 hover:scale-105 cursor-pointer"
          style={{
            transform: `translateX(calc(-50% + ${translateX}vw)) scale(${scale}) rotate(${rotate}deg)`,
            zIndex,
            opacity,
            width: `${scale * 90}%`,
            maxWidth: "400px",
          }}
        >
          <img
            src={slide.bg}
            alt={`Slide ${idx + 1}`}
className="w-full h-full max-h-screen object-cover rounded-xl"

          />
         <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-6 text-white text-left space-y-2 text-base md:text-lg lg:text-xl">
  {slide.text}
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
  </div>
</div>



      {/* Features Section */}
      <section className="py-20 px-4 bg-white text-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Innovative Tools for Medical Excellence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Medrae integrates modern technology with evidence-based education. Access structured medical content, detailed progress analytics, and interactive video lessons—all designed to support continuous professional growth and mastery in healthcare practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
         <Card 
  key={index} 
  className="border border-blue-400 hover:border-blue-600 transition-transform duration-300 shadow-sm hover:shadow-md rounded-lg hover:scale-105 cursor-pointer"
  onClick={() => navigate('/register')}
>

                <CardHeader>
                  <div className="h-12 w-12 bg-gradient-medical rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-tr from-blue-500 to-blue-200 text-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Elevate Your Medical Career with Medrae
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
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Medrae</span>
          </div>
          <p className="text-muted-foreground mb-6">
            Advancing medical education, clinical excellence, and professional growth through innovation and collaboration.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary">About</a>
            <a href="#" className="hover:text-primary">Features</a>
            <a href="#" className="hover:text-primary">Careers</a>
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Index;
