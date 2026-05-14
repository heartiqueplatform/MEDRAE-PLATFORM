import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HeroMobileCard = () => {
    const navigate = useNavigate();

    const backgroundImages = [
        "high1.png",
        "high2.png",
        "high3.png",
        "high4.png",
        "high5.png",
        "high6.png",
    ];

    const [currentImage, setCurrentImage] = useState(0);

    // Auto change image every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % backgroundImages.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="relative w-full  min-h-screen overflow-hidden text-white border-0 rounded-3xl bg-slate-950">
            {/* Background Images (Smooth Fade) */}
            {backgroundImages.map((img, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImage ? "opacity-40" : "opacity-0"
                        }`}
                    style={{
                        backgroundImage: `url(/${img})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            ))}

            {/* Elegant Gradient Overlay for Text Contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950" />

            {/* Content Container */}
            <CardContent className="relative z-10 flex flex-col min-h-screen px-4 pt-16 pb-10 justify-between">

                {/* 1. Header Section */}
                <div className="flex flex-col items-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full" />
                        <img
                            src="/pwa-192x192.jpeg"
                            alt="Medrae Logo"
                            className="relative w-20 h-20 rounded-2xl shadow-2xl border border-white/10"
                        />
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            MEDRAE
                        </h1>
                        <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">
                            Learn • Practice • Advance
                        </p>
                    </div>
                </div>

                {/* 2. Main Value Prop (Glass Card) */}
                <div className="space-y-6 mt-8 flex-grow">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-blue-100 leading-tight">
                            Master the NCK Exam with Precision.
                        </h2>
                        <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                            Practice with <span className="text-white font-bold">5,000+ updated questions</span>.
                            Train in DigiProctor-style timed modes with instant explanations.
                        </p>

                        {/* Feature Chips */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {["Timed Exams", "Failed-Question Tracking", "Unit Revision"].map((tag) => (
                                <span key={tag} className="text-[10px] font-bold py-1 px-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 3. Secondary Info: Institutions */}
                    <div className="px-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="h-px w-8 bg-blue-500" />
                            For Institutions
                        </h3>
                        <p className="mt-2 text-slate-400 text-sm leading-relaxed">
                            Host revision CATs, assignments, and mock exams.
                            Digitize your internal assessments and track student progress automatically.
                        </p>
                    </div>
                </div>

                {/* 4. Sticky-Style Footer Buttons */}
                <div className="flex flex-col gap-3 pt-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <Button
                        size="lg"
                        className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95"
                        onClick={() => navigate('/register')}
                    >
                        Get Started Now
                    </Button>

                    <Button
                        size="lg"
                        variant="ghost"
                        className="w-full h-14 text-white/70 font-semibold text-base hover:text-white transition-all"
                        onClick={() => navigate('/login')}
                    >
                        Already have an account? <span className="text-blue-400 ml-1 underline decoration-2 underline-offset-4">Log In</span>
                    </Button>

                    <p className="text-[10px] text-center text-slate-500 font-medium">
                        Join thousands of students across Kenya.
                    </p>
                </div>

            </CardContent>
        </Card>
    );
};

export default HeroMobileCard;