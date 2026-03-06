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
        <Card className="relative w-full min-h-[100vh] overflow-hidden text-white border-0 rounded-none">

            {/* Background Images (Smooth Fade) */}
            {backgroundImages.map((img, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImage ? "opacity-100" : "opacity-0"
                        }`}
                    style={{
                        backgroundImage: `url(/${img})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            ))}

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/65" />

            {/* Content */}
            <CardContent className="relative z-10 flex flex-col justify-center min-h-[100vh] px-2 py-12 space-y-2 font-sans">

                {/* Logo + Title */}
                <div className="flex flex-col items-center space-y-3">
                    <img
                        src="/pwa-192x192.jpeg"
                        alt="Medrae Logo"
                        className="w-16 h-16 rounded-xl shadow-lg"
                    />

                    <h1 className="text-3xl font-extrabold tracking-wide">
                        MEDRAE
                    </h1>
                </div>

                {/* Description */}
                <div className="space-y-2 text-base leading-relaxed text-white/95 text-start ">
                    <p>
                        Medrae is built for serious NCK exam preparation. Practice 5,000+
                        updated NCK-style questions with instant explanations after every answer.
                    </p>

                    <p className="font-semibold text-white">
                        Kenya’s Structured NCK Exam Practice & Digital Testing Platform
                    </p>

                    <p>
                        Train in DigiProctor-style exam mode with timed practice,
                        unit-based revision, and automatic tracking of every failed question —
                        helping students master exam strategy and build real confidence.
                    </p>

                    <p>
                        Access structured units, weak-topic tracking, and a growing
                        5,000+ question bank updated to match current NCK exam trends.
                    </p>

                    <p className="font-semibold text-2xl text-white">
                        For Tutors & Institutions
                    </p>

                    <p>
                        Medrae also offers affordable institutional online exam hosting with a powerful
                        DigiProctor system. Tutors can upload revision questions, CATs, assignments,
                        mock exams, and internal assessments  all fully digitized and automatically tracked.
                    </p>

                    <p>
                        Save time on marking, go fully digital, and train your students to confidently
                        sit any computer-based exam  including NCK without fear.
                    </p>
                </div>
                {/* Buttons */}
                <div className="flex flex-col gap-2 pt-0">
                    <Button
                        size="lg"
                        className="bg-blue-500 text-white font-bold text-lg md:text-2xl px-8 py-3 rounded-3xl shadow-lg
  transition-all duration-300 md:hover:bg-blue-600 md:hover:scale-105"
                        onClick={() => navigate('/register')}
                    >
                        Create Account
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        className="border-yellow-500 text-blue-500 font-bold text-base md:text-lg px-8 py-3 rounded-3xl shadow-lg
  transition-all duration-300 md:hover:bg-blue-500 md:hover:text-white md:hover:scale-105"
                        onClick={() => navigate('/login')}
                    >
                        Sign In to Continue
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
};

export default HeroMobileCard;