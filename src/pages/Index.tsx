// src/pages/Index.tsx
import { useEffect, useState } from "react";
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
    accent: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/15",
  },
  {
    id: "staff",
    Icon: Stethoscope,
    title: "I'm a nurse or midwife",
    desc: "Track your licence, build a CPD portfolio, earn MedraeCoins.",
    highlights: ["CPD portfolio", "MedraeCoins", "Verified contributor"],
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-500/15",
  },
  {
    id: "tutor",
    Icon: Users,
    title: "I'm a tutor or institution",
    desc: "Host digital exams for your cohort with DigiProctor exam mode.",
    highlights: ["Cohort control", "Auto-grading", "Analytics"],
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/15",
  },
  {
    id: "medrae-coins",
    Icon: Coins,
    title: "What are MedraeCoins?",
    desc: "Learn how coins work for students and staff — earning, cash-out, and policy.",
    highlights: ["Earn by engaging", "Earn by teaching", "Anti-abuse rules"],
    accent: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-500/15",
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

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % SLIDESHOW.length);
    }, 6000);
    return () => clearInterval(interval);
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

  // Hide page scrollbar while on Index
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-[#0d1117] text-slate-900 dark:text-white no-scrollbar">

      {/* ═══════════════ FULL-BLEED IMAGE SLIDESHOW ═══════════════ */}
      <div className="fixed inset-0 z-0">
        {SLIDESHOW.map((img, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
            style={{
              backgroundImage: `url('${img}')`,
              opacity: i === slideIdx ? 1 : 0,
            }}
          />
        ))}

        {/* Scrim — flips with theme so text stays readable */}
        <div
          className="absolute inset-0"
          style={{
            background: "var(--index-scrim)",
          }}
        />

        {/* Top + bottom fades to blend into header/footer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "var(--index-fade)",
          }}
        />
      </div>

      {/* Scoped CSS variables for the two scrims */}
      {/* Scoped CSS variables for the two scrims */}
      <style>{`
  :root {
    /* Light mode: white on the left for text, dark-ish on the right so photos stay rich */
    --index-scrim: linear-gradient(to right,
      rgba(255,255,255,0.95) 0%,
      rgba(255,255,255,0.82) 30%,
      rgba(15,23,42,0.35) 65%,
      rgba(15,23,42,0.65) 100%);
    --index-fade: linear-gradient(to bottom,
      rgba(255,255,255,0.55) 0%,
      rgba(255,255,255,0) 15%,
      rgba(15,23,42,0.15) 85%,
      rgba(15,23,42,0.45) 100%);
  }
  .dark {
    --index-scrim: linear-gradient(to right,
      rgba(13,17,23,0.95) 0%,
      rgba(13,17,23,0.75) 35%,
      rgba(13,17,23,0.55) 60%,
      rgba(13,17,23,0.35) 100%);
    --index-fade: linear-gradient(to bottom,
      rgba(13,17,23,0.60) 0%,
      rgba(13,17,23,0) 15%,
      rgba(13,17,23,0) 85%,
      rgba(13,17,23,0.60) 100%);
  }
`}</style>

      {/* ═══════════════ CONTENT ON TOP ═══════════════ */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">

        {/* Brand strip */}
        <div className="flex items-center mb-10 md:mb-16">
          <div className="flex items-center gap-3.5 md:gap-5">
            <img
              src="/pwa-192x192.jpeg"
              alt="Medrae"
              className="h-14 w-14 md:h-24 md:w-24 rounded-2xl md:rounded-3xl ring-none"
            />
            <div>
              <p className="text-2xl md:text-5xl font-black tracking-tight leading-none">
                <span className="text-red-500">MEDRAE</span>{" "}
                <span className="text-slate-900 dark:text-white">NURSING</span>
              </p>
              <p className="mt-2 md:mt-3 text-[10px] md:text-sm font-bold uppercase tracking-[0.28em] md:tracking-[0.32em] text-slate-600 dark:text-slate-400">
                Kenya Nursing Network
              </p>
            </div>
          </div>
        </div>

        {/* Hero headline */}
        <div className="max-w-3xl mb-10 md:mb-14">
          <h1 className="text-[34px] sm:text-5xl lg:text-6xl font-bold tracking-[-0.03em] leading-[1.02]">
            Everything a Kenyan
            <br />
            <span className="text-blue-600 dark:text-blue-400">nurse needs to succeed.</span>
          </h1>

          <p className="mt-4 md:mt-5 text-[15px] md:text-[17px] italic font-semibold text-slate-700 dark:text-slate-300 leading-[1.7]">
            We learn with love. We care with heart.
          </p>

          <p className="mt-3 md:mt-4 text-[14px] md:text-[16px] text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed">
            From nursing school to NCK licensure to CPD — one platform, one place.
            Choose your path below and we'll show you exactly what's waiting.
          </p>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-10 md:mb-14 text-[11px] md:text-[12px] text-slate-700 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
            Trusted by 2K+ nurses
          </span>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
            NCK-aligned content
          </span>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            4.8 average rating
          </span>
        </div>

        {/* Role cards — 2 columns on desktop for balanced 2×2 */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500 mb-3">
            Choose your path
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-w-5xl">
            {ROLES.map(({ id, Icon, title, desc, highlights, accent, accentBg }) => (
              <button
                key={id}
                onClick={() => pick(id)}
                className="group w-full text-left rounded-2xl
                           bg-white/80 dark:bg-[#0d1117]/80
                           backdrop-blur-md
                           hover:bg-white/95 dark:hover:bg-[#0d1117]/90
                           ring-1 ring-slate-900/5 dark:ring-white/5
                           p-5 md:p-6
                           transition-all duration-300
                           active:scale-[0.98]"
                style={{ touchAction: "manipulation" }}
              >
                <div className={`shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl
                                 ${accentBg}
                                 flex items-center justify-center
                                 transition-colors duration-300`}>
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 ${accent}`} strokeWidth={2.2} />
                </div>

                <p className="text-[15px] md:text-[16px] font-bold leading-tight mt-4 text-slate-900 dark:text-white">
                  {title}
                </p>
                <p className="text-[12.5px] md:text-[13px] text-slate-600 dark:text-slate-300 mt-2 leading-snug">
                  {desc}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-4">
                  {highlights.map((chip) => (
                    <span
                      key={chip}
                      className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider
                                 px-2 py-0.5 rounded-full
                                 bg-slate-900/[0.06] dark:bg-white/[0.10]
                                 text-slate-700 dark:text-slate-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider
                                   text-slate-500 dark:text-slate-400
                                   group-hover:text-slate-900 dark:group-hover:text-white
                                   transition-colors">
                    Continue
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500
                                         group-hover:text-slate-900 dark:group-hover:text-white
                                         group-hover:translate-x-1
                                         transition-all duration-300" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sign in link + short tagline */}
        <div className="mt-10 md:mt-14 space-y-3">
          <p className="text-[12px] md:text-[13px] italic font-semibold text-slate-600 dark:text-slate-400">
            Care begins with love.
          </p>
          <p className="text-[12px] md:text-[13px] text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <button
              onClick={() => nav("/login")}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}