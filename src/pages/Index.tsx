import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { supabase } from "@/lib/supabaseClient";


const Index = () => {

    const [isOffline, setIsOffline] = useState(!navigator.onLine);
 const [loading, setLoading] = useState(true); // ⬅️ prevent render until session check


    useEffect(() => {
   const checkInternetAccess = async () => {
  try {
    const res = await fetch("https://www.gstatic.com/generate_204", {
      method: "GET",   // ✅ use GET instead of HEAD
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
    };

    const handleConnectionChange = async () => {
      const hasInternet = await checkInternetAccess();
      if (navigator.onLine && hasInternet) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    };

    // run immediately when app starts
    handleConnectionChange();

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    // keep checking every 10s (in case wifi is on but no net)
    const interval = setInterval(handleConnectionChange, 10000);

    return () => {
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
      clearInterval(interval);
    };
  }, []);

  const navigate = useNavigate();
  useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      // 🔹 Logged in → redirect immediately
      navigate("/redirect", { replace: true });
    } else {
      // 🔹 If offline but logged in before → go to role dashboard
      const hasLoggedInBefore = localStorage.getItem("hasLoggedInBefore");
      const userRole = localStorage.getItem("userRole");

      if (isOffline && hasLoggedInBefore && userRole) {
        navigate(`/dashboard/${userRole}`, { replace: true });
      }
    }

    setLoading(false); // ✅ allow rendering only if not logged in
  };

  checkSession();
}, [navigate, isOffline]);



  const features = [
    {
      icon: Brain,
      title: "AI Study Assistant",
      description: "Get instant guidance on nursing concepts, drug information, and study techniques directly on the platform. The AI helps you clarify difficult topics and provides personalized suggestions."
    },
    {
      icon: Users,
      title: "Collaborative Learning",
      description: "Connect with fellow nursing students, join group discussions, and participate in study groups to enhance understanding and retention through shared learning."
    },
    {
      icon: Star,
      title: "Progress Tracking",
      description: "Monitor your learning journey with visual progress trackers and star-based topic ratings, helping you identify strengths and areas for improvement."
    },
    {
      icon: Play,
      title: "Video Learning & Daily Updates",
      description: "Access MedTube videos and short-form Reels for visual learning. Update your daily study status to make each day productive and ensure continuous learning without wasting time."
    }
  ];
  if (loading) {
  return null; // or return <div>Loading...</div> if you prefer a loader
}
return (
  <div className="min-h-screen relative">
    {/* Offline card (only shows if offline) */}
    {isOffline && (
      <div className="absolute inset-0 bg-black/90 flex items-start justify-center pt-10 z-50">
        <div className="bg-white dark:bg-gray-900 text-center p-6 rounded-2xl shadow-xl max-w-sm mx-auto">
          <p className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
            No internet connection
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            Check your internet connection and try again.
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )}
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Heart className="h-5 w-5" />
              <span className="text-sm font-medium">Heartique Nursing Nexus Scholar Platform V1.0</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              HEARTIQUE NURSING
              <br />
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                NEXUS SCHOLAR
              </span>
              <br />
              Platform
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
  Heartique Nursing Nexus Scholar is your all-in-one learning hub. Access an extensive collection of nursing questions with detailed explanations, organized by study units for easy understanding and long-term memory retention. Participate in NCK-style simulations to boost exam familiarity and confidence. Enhance your learning further with video tutorials and daily progress updates to make each study session productive and structured.  
  <br /><br />
  For the best experience, we recommend using a desktop, as the screen displays content more clearly, but you can still use your phone if needed.  
  <br /><br />
  All plans provide full access to these features, with the only difference being the duration: <strong>Pro</strong> at KSh 99/month or <strong>Premium</strong> at KSh 450/year. Plus, the first 1,000 users enjoy a <strong>free 3-month trial</strong> to kickstart their learning journey with complete access!
</p>

          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate('/register')}
            >
              Start Learning Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
  size="lg" 
  variant="outline" 
  className="border-white text-primary hover:bg-white/10"
  onClick={() => navigate('/login')}
>
  Continue Learning Sign In
</Button>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white text-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Modern Nursing Education
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
  Heartique Nursing Nexus Scholar organizes your study journey with comprehensive notes and high-quality questions arranged by units, tracks your progress, and provides carefully curated video tutorials. Engage in focused chat rooms for collaborative learning, all powered by AI to help students and tutors excel efficiently.
</p>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
            <Card 
  key={index} 
  className="border border-blue-400 hover:border-blue-600 transition-all duration-300 shadow-sm hover:shadow-md rounded-lg"
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
            Join the Future of Nursing Education
          </h2>
        <p className="text-xl text-white mb-8">
  Heartique Nursing Nexus Scholar offers students and tutors a fully interactive, AI-powered learning hub. Dive into well-structured lessons, track your progress, and collaborate efficiently—experience a smarter, more effective way to study and teach today.
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
            <span className="text-xl font-bold">Heartique Nursing Nexus Scholar</span>
          </div>
          <p className="text-muted-foreground mb-6">
            Empowering the next generation of nursing professionals with AI-assisted learning and collaborative tools.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary">About</a>
            <a href="#" className="hover:text-primary">Features</a>
            <a href="#" className="hover:text-primary">Support</a>
            <a href="#" className="hover:text-primary">Privacy</a>
            <a href="#" className="hover:text-primary">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Index;
