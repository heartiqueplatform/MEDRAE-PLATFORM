import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Users, Star, ArrowRight, CheckCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";


const Index = () => {
  const navigate = useNavigate();
    useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // 🔹 already logged in → send to redirect handler
        navigate("/redirect");
      }
    };
    checkSession();
  }, [navigate]);
useEffect(() => {
  document.documentElement.classList.remove("dark");
}, []);


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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-6">
              <Heart className="h-5 w-5" />
              <span className="text-sm font-medium">Heartique Nursing Nexus Scholar Platform V1.0</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your AI-Powered
              <br />
              <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Nursing Education
              </span>
              <br />
              Platform
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Heartique Nursing Nexus Scholar is your all-in-one learning hub. Access a large collection of nursing questions with detailed explanations, arranged by study units for easy comprehension and long-term memory retention. Engage in NCK-style simulations to enhance your exam familiarity and confidence. Complement your learning with video tutorials and daily status updates to make every study day productive and structured.
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
  Sign In
</Button>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for Modern Nursing Education
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Heartique Nursing Nexus Scholar combines AI, multimedia, and collaborative learning to give students and tutors all the tools needed to excel. Learn, track, and connect—all in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-soft hover:shadow-medical transition-shadow">
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
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Join the Future of Nursing Education
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Heartique Nursing Nexus Scholar provides students and tutors with a comprehensive, interactive, and AI-enhanced learning environment. Explore the platform today and experience a smarter way to study and teach.
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
