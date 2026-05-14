import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Heart, Activity, Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Diagnostic: Route Flattened at",
      location.pathname
    );
  }, [location.pathname]);

  useEffect(() => {
    const container = document.getElementById("heart-zone");

    const createHeart = (x, y) => {
      const heart = document.createElement("div");
      heart.className = "heart-particle";
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;

      // Randomize size slightly for a "pulse" feel
      const size = Math.random() * (16 - 8) + 8;
      heart.style.width = `${size}px`;
      heart.style.height = `${size}px`;

      container.appendChild(heart);

      setTimeout(() => {
        heart.remove();
      }, 2000);
    };

    let lastX = 0;
    let lastY = 0;
    const MIN_DISTANCE = 35;

    const handleMove = (e) => {
      const isButton = e.target.closest("#safe-button");
      if (isButton) return;

      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;

      const distance = Math.hypot(x - lastX, y - lastY);
      if (distance < MIN_DISTANCE) return;

      lastX = x;
      lastY = y;
      createHeart(x, y);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
    };
  }, []);

  return (
    <div
      id="heart-zone"
      className="relative min-h-screen w-full bg-[#050505] text-white flex items-center justify-center overflow-hidden px-6 font-sans"
    >
      {/* MEDICAL GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* BACKGROUND GLOW */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-xl">
        {/* App Branding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <img
            src="/icon-512.jpg"
            alt="MEDRAE"
            className="w-16 h-16 mx-auto mb-4 rounded-[1.2rem] shadow-2xl border border-white/10"
          />
          <h2 className="text-xs font-black tracking-[0.4em] text-indigo-500 uppercase">
            Medrae Systems
          </h2>
        </motion.div>

        {/* 404 Vitals */}
        <div className="relative mb-8">
          <h1 className="text-[12rem] font-black leading-none tracking-tighter opacity-5 select-none">
            404
          </h1>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Activity className="w-12 h-12 text-rose-500 mb-2 animate-pulse" />
            <h3 className="text-4xl font-black tracking-tight">Route Offline</h3>
          </div>
        </div>

        <p className="text-slate-400 text-lg mb-10 max-w-sm mx-auto leading-relaxed">
          The vitals for this page have flattened, but <span className="text-white font-semibold">care doesn’t stop</span> here.
        </p>

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            id="safe-button"
            to="/"
            className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-bold hover:bg-indigo-50 transition-all duration-300 shadow-xl shadow-white/5 active:scale-95"
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Page
          </button>
        </div>

        {/* Subtle Footer */}
        <p className="mt-20 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          Interactive Diagnostic: Move cursor to initiate pulse
        </p>
      </div>

      {/* Styles */}
      <style>
        {`
          .heart-particle {
            position: absolute;
            background: #6366f1; /* Indigo color for a smarter look */
            clip-path: path('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
            transform-origin: center;
            animation: heartPulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
            pointer-events: none;
            z-index: 5;
          }

          @keyframes heartPulse {
            0% {
              transform: translate(-50%, -50%) scale(0) rotate(0deg);
              opacity: 1;
              filter: blur(0px);
            }
            50% {
              opacity: 0.8;
              filter: blur(1px);
            }
            100% {
              transform: translate(-50%, -150%) scale(1.5) rotate(15deg);
              opacity: 0;
              filter: blur(4px);
            }
          }

          .animate-marquee-slow {
            animation: marquee 25s linear infinite;
          }

          @keyframes marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}
      </style>
    </div>
  );
};

export default NotFound;