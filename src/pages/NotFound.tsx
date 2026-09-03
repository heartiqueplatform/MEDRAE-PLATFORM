import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Heart, Activity, Home, ArrowLeft, Brain, Target, BookOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Diagnostic: Route Flattened at",
      location.pathname
    );
  }, [location.pathname]);
  // Heart particles effect
  useEffect(() => {
    const container = document.getElementById("heart-zone");
    const createHeart = (x, y) => {
      const heart = document.createElement("div");
      heart.className = "heart-particle";
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
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

  // Smart messages for the right side
  const smartMessages = [
    {
      icon: Brain,
      title: "Smart Navigation",
      description: "Our intelligent routing system helps you find exactly what you're looking for. Every path is designed to guide you to success."
    },
    {
      icon: Target,
      title: "Focused Learning",
      description: "Medrae Nursing Kenya is built to keep you on track. Even when you wander, we help you find your way back to progress."
    },
    {
      icon: BookOpen,
      title: "Knowledge at Your Fingertips",
      description: "With 6,500+ NCK-style questions and structured revision units, you're never lost in your nursing journey."
    },
    {
      icon: Sparkles,
      title: "Your Nursing Companion",
      description: "Every click brings you closer to your goals. We're here to support your nursing education every step of the way."
    }
  ];

  const [currentMessage] = useState(smartMessages[Math.floor(Math.random() * smartMessages.length)]);
  const MessageIcon = currentMessage.icon;

  // Background images for slideshow
  const bgImages = ['/high6.png', '/indexbackground2.jpg', '/high3.png'];
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="heart-zone"
      className="relative min-h-screen w-full bg-white text-gray-900 flex items-center overflow-hidden font-sans"
    >
      {/* LEFT SIDE - Images Slideshow */}
      <div className="hidden lg:flex lg:w-1/2 h-screen relative overflow-hidden">
        {bgImages.map((img, index) => (
          <div
            key={index}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
            style={{
              backgroundImage: `url('${img}')`,
              opacity: index === currentBgIndex ? 1 : 0,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent z-10" />

        {/* Overlay content on image side */}
        <div className="absolute inset-0 z-20 flex flex-col items-start justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <img
              src="/icon-512.jpg"
              alt="MEDRAE"
              className="w-20 h-20 rounded-2xl shadow-2xl border border-white/20 mb-6"
            />
            <h1 className="text-6xl font-black tracking-tight mb-2">
              <span className="text-red-500">Medrae</span> Nursing
            </h1>
            <p className="text-white/70 text-lg font-medium">Kenya's Premier Nursing Platform</p>

            <div className="mt-8 flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white/30 bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" />
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-white/80 ml-2">2,231+ Active Students</span>
            </div>
          </motion.div>
        </div>

        {/* Slideshow dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
          {bgImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBgIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentBgIndex
                ? 'w-8 bg-white'
                : 'bg-white/40 hover:bg-white/60'
                }`}
            />
          ))}
        </div>
      </div>

      {/* RIGHT SIDE - Smart Message & Navigation */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center px-6 py-12 bg-white">
        <div className="max-w-lg w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 lg:hidden"
          >
            <img
              src="/icon-512.jpg"
              alt="MEDRAE"
              className="w-16 h-16 rounded-2xl shadow-2xl border border-gray-200 mb-4"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-indigo-50">
                <Activity className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-[0.2em] uppercase text-indigo-500">
                  Status: Route Offline
                </h2>
                <p className="text-3xl font-black tracking-tight">404 Not Found</p>
              </div>
            </div>
          </motion.div>

          {/* Smart Message Card - NO BORDERS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl mb-8 bg-gray-50 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-100">
                <MessageIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1 text-gray-900">
                  {currentMessage.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {currentMessage.description}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Additional Smart Insight - NO BORDERS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-4 rounded-xl mb-8 bg-blue-50"
          >
            <p className="text-sm font-medium text-blue-700">
              💡 Did you know? Medrae has helped over 2,000 nursing students pass their NCK exams with confidence.
            </p>
          </motion.div>

          {/* Navigation Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              id="safe-button"
              to="/"
              className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl w-full sm:w-auto font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-300 shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              <Home className="w-5 h-5" />
              Return to Dashboard
            </Link>

            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl w-full sm:w-auto font-bold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous Page
            </button>
          </motion.div>

          {/* Subtle Footer */}
          <p className="mt-12 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Interactive: Move cursor to initiate pulse
          </p>
        </div>
      </div>

      {/* Mobile Background Image */}
      <div className="lg:hidden absolute inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('/high6.png')` }} />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <div className="lg:hidden relative z-10 w-full min-h-screen flex items-center justify-center">
        {/* Mobile content is handled above with w-full lg:w-1/2 */}
      </div>

      {/* Styles */}
      <style>
        {`
          .heart-particle {
            position: absolute;
            background: #6366f1;
            clip-path: path('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z');
            transform-origin: center;
            animation: heartPulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) forwards;
            pointer-events: none;
            z-index: 999;
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
        `}
      </style>
    </div>
  );
};

export default NotFound;