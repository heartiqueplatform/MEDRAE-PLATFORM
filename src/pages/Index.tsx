// src/pages/Index.tsx
import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, Stethoscope, Users, ArrowRight, Coins,
  CheckCircle, Star, Shield,
} from "lucide-react";

const ROLES = [
  {
    id: "student",
    Icon: GraduationCap,
    title: "I'm a nursing student",
    desc: "Prepare for NCK, FQEs, and college exams with 6,500+ questions.",
    highlights: ["Exam prep", "Instant explanations", "Progress tracking"],
    accent: "text-blue-300",
    accentBg: "bg-blue-500/25",
    cardBg: "bg-blue-500/[0.50] hover:bg-blue-500/[0.60]",
  },
  {
    id: "staff",
    Icon: Stethoscope,
    title: "I'm a nurse or midwife",
    desc: "Track your licence, build a CPD portfolio, earn MedraeCoins.",
    highlights: ["CPD portfolio", "MedraeCoins", "Verified contributor"],
    accent: "text-emerald-300",
    accentBg: "bg-emerald-500/25",
    cardBg: "bg-emerald-500/[0.50] hover:bg-emerald-500/[0.60]",
  },
  {
    id: "tutor",
    Icon: Users,
    title: "I'm a tutor or institution",
    desc: "Host digital exams for your cohort with DigiProctor exam mode.",
    highlights: ["Cohort control", "Auto grading", "Analytics"],
    accent: "text-violet-300",
    accentBg: "bg-violet-500/25",
    cardBg: "bg-violet-500/[0.50] hover:bg-violet-500/[0.60]",
  },
  {
    id: "medrae-coins",
    Icon: Coins,
    title: "What are MedraeCoins?",
    desc: "Learn how coins work for students and staff, earning, cash out, and policy.",
    highlights: ["Earn by engaging", "Earn by teaching", "Anti abuse rules"],
    accent: "text-amber-300",
    accentBg: "bg-amber-500/25",
    cardBg: "bg-amber-500/[0.50] hover:bg-amber-500/[0.60]",
  },
] as const;

const SLIDESHOW = [
  "/indexbackground2.jpg",
  "/indexbackground3.jpg",
  "/indexbackground5.jpg",
  "/high6.png",
];

export default function Index() {
  const nav = useNavigate();
  const [slideIdx, setSlideIdx] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % SLIDESHOW.length);
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setMouse({
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: (e.clientY / window.innerHeight) * 2 - 1,
        });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const pick = (id: string) => {
    if (id === "medrae-coins") {
      nav("/medrae-coins");
      return;
    }
    localStorage.setItem("medrae.persona", id);
    sessionStorage.removeItem("medrae.seen_chooser");
    nav(`/for/${id}`);
  };

  useEffect(() => {
    document.documentElement.style.scrollbarWidth = "none";
    document.documentElement.style.msOverflowStyle = "none";
    const style = document.createElement("style");
    style.id = "hide-scrollbar-index";
    style.textContent = `
      html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
      html, body { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
    return () => {
      document.documentElement.style.scrollbarWidth = "";
      document.documentElement.style.msOverflowStyle = "";
      document.getElementById("hide-scrollbar-index")?.remove();
    };
  }, []);

  const onCardMove = (e: MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0e0b09] text-white no-scrollbar">

      <style>{`
        :root {
          --index-scrim:
            radial-gradient(ellipse at 50% 45%,
              rgba(22, 18, 14, 0.10) 0%,
              rgba(22, 18, 14, 0.55) 45%,
              rgba(18, 14, 11, 0.90) 80%,
              rgba(14, 11, 9, 0.99) 100%);
          --index-fade: linear-gradient(to bottom,
            rgba(16, 13, 10, 0.92) 0%,
            rgba(16, 13, 10, 0) 22%,
            rgba(16, 13, 10, 0) 68%,
            rgba(14, 11, 9, 0.99) 100%);
        }

        @keyframes kb-a {
          0%   { transform: scale(1.03) translate3d(0.5%, 0.4%, 0); }
          100% { transform: scale(1.05) translate3d(-0.5%, -0.4%, 0); }
        }
        @keyframes kb-b {
          0%   { transform: scale(1.05) translate3d(-0.5%, -0.4%, 0); }
          100% { transform: scale(1.03) translate3d(0.5%, 0.4%, 0); }
        }
        .kb-a { animation: kb-a 22s ease-in-out infinite alternate; }
        .kb-b { animation: kb-b 22s ease-in-out infinite alternate; }

        @keyframes rise {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rise { animation: rise 1s cubic-bezier(.2,.7,.2,1) both; }

        @keyframes shimmer { to { background-position: 200% center; } }
        .accent-grad {
          background: linear-gradient(100deg,
            #60a5fa 0%, #93c5fd 30%, #c7d2fe 50%, #93c5fd 70%, #60a5fa 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
          animation: shimmer 8s linear infinite;
        }

        @keyframes floatBlob {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(40px, -50px, 0) scale(1.12); }
        }
        .blob { animation: floatBlob 22s ease-in-out infinite; }

        .grain::after {
          content: "";
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>");
          opacity: 0.07;
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .spot { position: relative; overflow: hidden; }
        .spot::before {
          content: "";
          position: absolute; inset: 0;
          border-radius: inherit;
          background: radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%),
            rgba(255, 255, 255, 0.14), transparent 45%);
          opacity: 0;
          transition: opacity .45s ease;
          pointer-events: none;
          z-index: 0;
        }
        .spot:hover::before { opacity: 1; }

        @media (prefers-reduced-motion: reduce) {
          .kb-a, .kb-b, .blob, .accent-grad, .rise { animation: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-0 overflow-hidden">

        <div
          className="absolute -inset-6 will-change-transform"
          style={{
            transform: `translate3d(${mouse.x * -14}px, ${mouse.y * -14}px, 0)`,
            transition: "transform 500ms ease-out",
          }}
        >
          {SLIDESHOW.map((img, i) => (
            <div
              key={i}
              className={`absolute inset-0 bg-cover bg-center will-change-transform ${i % 2 === 0 ? "kb-a" : "kb-b"
                }`}
              style={{
                backgroundImage: `url('${img}')`,
                opacity: i === slideIdx ? 1 : 0,
                transition: "opacity 1800ms cubic-bezier(.4,0,.2,1)",
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0" style={{ background: "var(--index-scrim)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--index-fade)" }} />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate3d(${mouse.x * 12}px, ${mouse.y * 12}px, 0)`,
            transition: "transform 600ms ease-out",
          }}
        >
          <div className="blob absolute -top-40 -left-32 w-[560px] h-[560px] rounded-full bg-amber-800/25 blur-[140px]" style={{ animationDelay: "0s" }} />
          <div className="blob absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-orange-900/25 blur-[140px]" style={{ animationDelay: "-8s" }} />
          <div className="blob absolute -bottom-32 left-1/4 w-[440px] h-[440px] rounded-full bg-stone-700/30 blur-[140px]" style={{ animationDelay: "-15s" }} />
        </div>

        <div className="absolute inset-0 pointer-events-none grain" />
      </div>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">

        <div className="flex items-center mb-10 md:mb-16 rise" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-3.5 md:gap-5">
            <img
              src="/pwa-192x192.jpeg"
              alt="Medrae"
              className="h-14 w-14 md:h-24 md:w-24 rounded-2xl md:rounded-3xl"
            />
            <div>
              <p className="text-2xl md:text-5xl font-black tracking-tight leading-none">
                <span className="text-red-500">MEDRAE</span>{" "}
                <span className="text-white">NURSING</span>
              </p>
              <p className="mt-2 md:mt-3 text-[10px] md:text-sm font-bold uppercase tracking-[0.28em] md:tracking-[0.32em] text-stone-400">
                Kenya Nursing Network
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mb-10 md:mb-14">
          <h1
            className="text-[34px] sm:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.02] text-white rise"
            style={{ animationDelay: "0.15s" }}
          >
            Everything a Kenyan
            <br />
            <span className="accent-grad">nurse needs to succeed.</span>
          </h1>

          <p
            className="mt-4 md:mt-5 text-[15px] md:text-[17px] italic font-semibold text-stone-300 leading-[1.7] rise"
            style={{ animationDelay: "0.30s" }}
          >
            We learn with love. We care with heart.
          </p>

          <p
            className="mt-3 md:mt-4 text-[14px] md:text-[16px] text-stone-300 max-w-xl leading-relaxed rise"
            style={{ animationDelay: "0.40s" }}
          >
            From nursing school to NCK licensure to CPD, one platform, one place.
            Choose your path below and we will show you exactly what is waiting.
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 md:mb-14 text-[11px] md:text-[12px] text-stone-300 rise"
          style={{ animationDelay: "0.55s" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            Trusted by 2K+ nurses
          </span>
          <span className="hidden sm:inline text-stone-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            NCK aligned content
          </span>
          <span className="hidden sm:inline text-stone-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            4.8 average rating
          </span>
        </div>

        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 mb-3 rise"
            style={{ animationDelay: "0.65s" }}
          >
            Choose your path
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-5xl">
            {ROLES.map(
              ({ id, Icon, title, desc, highlights, accent, accentBg, cardBg }, i) => (
                <button
                  key={id}
                  onClick={() => pick(id)}
                  onMouseMove={onCardMove}
                  className={`group w-full text-left rounded-2xl rise spot
                              ${cardBg}
                              p-5 md:p-6
                              transition-colors duration-300
                              active:scale-[0.98]`}
                  style={{
                    touchAction: "manipulation",
                    animationDelay: `${0.75 + i * 0.08}s`,
                  }}
                >
                  <div className="relative z-10">
                    <div
                      className={`shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl
                                  ${accentBg}
                                  flex items-center justify-center
                                  transition-transform duration-500
                                  group-hover:scale-110 group-hover:-rotate-3`}
                    >
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${accent}`} strokeWidth={2.2} />
                    </div>

                    <p className="text-[15px] md:text-[16px] font-bold leading-tight mt-4 text-white">
                      {title}
                    </p>
                    <p className="text-[12.5px] md:text-[13px] text-stone-300/90 mt-2 leading-snug">
                      {desc}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-4">
                      {highlights.map((chip) => (
                        <span
                          key={chip}
                          className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider
                                     px-2 py-0.5 rounded-full
                                     bg-white/[0.07] text-stone-200"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider
                                       text-stone-400
                                       group-hover:text-white
                                       transition-colors">
                        Continue
                      </span>
                      <span className="relative flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-stone-400
                                               group-hover:text-white
                                               group-hover:translate-x-1.5
                                               transition-all duration-300" />
                      </span>
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-10 md:mt-14 space-y-3 rise" style={{ animationDelay: "1.15s" }}>
          <p className="text-[12px] md:text-[13px] italic font-semibold text-stone-400">
            Care begins with love.
          </p>
          <p className="text-[12px] md:text-[13px] text-stone-400">
            Already have an account?{" "}
            <button
              onClick={() => nav("/login")}
              className="text-amber-400 font-bold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </main>

      <div className="fixed bottom-5 right-5 z-20 flex items-center gap-2
                      px-3 py-2 rounded-full
                      bg-stone-900/60 backdrop-blur-md
                      ring-0
                      shadow-[0_8px_30px_-12px_rgba(0,0,0,0.65)]">
        {SLIDESHOW.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlideIdx(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-500 ease-out
              ${i === slideIdx
                ? "w-8 bg-white"
                : "w-1.5 bg-white/30 hover:bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}