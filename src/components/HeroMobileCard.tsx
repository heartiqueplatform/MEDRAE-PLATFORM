// src/components/HeroMobileCard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const HeroMobileCard = () => {
    const navigate = useNavigate();

    const backgroundImages = [
        "high6.png",
        "indexbackground2.jpg",
        "high3.png",
    ];

    const [currentImage, setCurrentImage] = useState(0);

    // Auto-cycle — matches the desktop's 2s interval
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % backgroundImages.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl
                       h-[68vh] min-h-[520px] max-h-[720px]"
        >
            {/* Background slideshow */}
            {backgroundImages.map((img, index) => (
                <div
                    key={index}
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
                    style={{
                        backgroundImage: `url(/${img})`,
                        opacity: index === currentImage ? 1 : 0,
                    }}
                />
            ))}

            {/* Overlay — same as desktop */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80 z-0" />

            {/* Content — bottom-anchored, left-aligned */}
            <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-12">

                {/* Cadre chips — same as desktop */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {["DCHN", "BSN", "KRN", "NCK prep", "CPD"].map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full
                                       bg-white/15 backdrop-blur-sm
                                       text-[9px] font-bold uppercase tracking-wider
                                       text-white/90"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Headline — same words as desktop */}
                <h1 className="text-white leading-[1.05] tracking-[-0.02em]">
                    <span className="block text-[22px] font-semibold text-white/90">
                        Pass your NCK, FQEs & exams —
                    </span>
                    <span className="block mt-1 text-[30px] font-bold">
                        with clarity, not chaos.
                    </span>
                </h1>

                {/* Sub-headline — same as desktop */}
                <p className="mt-3 text-[13px] text-white/80 leading-relaxed">
                    6,500+ updated exam-style questions. Instant explanations
                    after every answer. Structured revision for DCHN, BSN, KRN —
                    and the CPD portfolio to match.
                </p>

                {/* Two CTAs — same as desktop */}
                <div className="mt-5 flex flex-col gap-2.5">
                    <button
                        onClick={() => navigate("/register")}
                        className="w-full inline-flex items-center justify-center gap-2
                                   px-5 py-3.5 rounded-xl
                                   bg-white text-slate-900
                                   text-[14px] font-bold
                                   hover:bg-slate-100 active:scale-[0.97]
                                   transition-all group"
                        style={{ touchAction: "manipulation" }}
                    >
                        Start free
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                        onClick={() => {
                            document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="w-full inline-flex items-center justify-center gap-2
                                   px-5 py-3 rounded-xl
                                   bg-white/10 backdrop-blur-md
                                   text-white text-[13px] font-bold
                                   hover:bg-white/20 active:scale-[0.97]
                                   transition-all"
                        style={{ touchAction: "manipulation" }}
                    >
                        See what's inside
                    </button>
                </div>

                {/* Slideshow dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {backgroundImages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentImage(index)}
                            aria-label={`Go to slide ${index + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentImage
                                ? "w-8 bg-white"
                                : "w-1.5 bg-white/40 hover:bg-white/60"
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HeroMobileCard;