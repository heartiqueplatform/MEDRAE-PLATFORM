import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { supabase } from "@/lib/supabaseClient";


const Index = () => {
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
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
      <section className="bg-gradient-hero text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Heart className="h-5 w-5" />
              <span className="text-sm font-medium">Medrae Medical Network Platform V1.0</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              MEDRAE MEDICAL 
              <br />
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                NETWORK
              </span>
              <br />
              Platform
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Medrae is a professional platform for medical education, clinical training, and healthcare career advancement. Explore verified question banks, case-based scenarios, and evidence-driven study materials tailored for healthcare excellence. Strengthen your skills through simulations, certification modules, and structured progression tracking.  
              <br /><br />
              For the best experience, access Medrae via desktop for enhanced clarity and performance, or use mobile for flexible learning anywhere.  
              <br /><br />
              All plans include full feature access—choose <strong>Pro</strong> at KSh 99/month or <strong>Premium</strong> at KSh 450/year. The first 1,000 users receive a <strong>free 6-month professional trial</strong> to experience Medrae’s complete suite of educational and career tools.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate('/register')}
            >
              Join Medrae
              <ArrowRight className="ml-2 h-5 w-5" />
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
        </div>
      </section>

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
