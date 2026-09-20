"use client";
import { useEffect, useState, useRef } from "react";

const BRAND = "MEDRAE NURSING";

const TAGLINES = [
  // --- Identity ---
  "Think like a nurse.",
  "Care starts here.",
  "Built for the bedside.",
  "Become the one.",
  "For the becoming nurse.",
  "Sharp minds. Steady hands.",

  // --- Mindset ---
  "Assess, don't assume.",
  "Trust your gut.",
  "When in doubt, escalate.",
  "Study like it matters.",
  "Practice with purpose.",
  "Show up ready.",

  // --- Growth ---
  "Become undeniable.",
  "Learn. Care. Lead.",
  "Earn the trust.",
  "Where great nurses grow.",
  "You'll be trusted.",
  "Your patients wait.",
];

/* Expanded gradient palette — cycles through identity and knowledge palettes */
const TAGLINE_GRADIENTS = [
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-blue-500 via-indigo-500 to-purple-500",
  "from-rose-500 via-pink-500 to-fuchsia-500",
  "from-amber-500 via-orange-500 to-red-500",
  "from-cyan-500 via-blue-500 to-indigo-500",
  "from-violet-500 via-purple-500 to-pink-500",
  "from-teal-500 via-emerald-500 to-lime-500",
  "from-indigo-500 via-blue-500 to-sky-500",
  "from-red-500 via-rose-500 to-pink-500",
  "from-lime-500 via-green-500 to-emerald-500",
  "from-fuchsia-500 via-purple-500 to-violet-500",
  "from-sky-500 via-cyan-500 to-teal-500",
];

type Phase = "typing-brand" | "holding-brand" | "erasing-brand" | "taglines";

/* Fisher-Yates shuffle — random order per mount */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function GlobalLoader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [phase, setPhase] = useState<Phase>("typing-brand");

  const [displayedBrand, setDisplayedBrand] = useState("");
  const [displayedTagline, setDisplayedTagline] = useState("");
  const [taglineIndex, setTaglineIndex] = useState(0);

  /* Shuffled sequence — computed ONCE per mount, so it stays consistent within a session */
  const shuffledRef = useRef<string[] | null>(null);
  if (shuffledRef.current === null) {
    shuffledRef.current = shuffle(TAGLINES);
  }
  const SEQUENCE = shuffledRef.current;

  /* ---------- Theme ---------- */
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  /* ---------- Phase 1: type brand ---------- */
  useEffect(() => {
    if (phase !== "typing-brand") return;

    const letters = BRAND.split("");
    let i = 0;
    let timer: NodeJS.Timeout;

    const typeNext = () => {
      if (i < letters.length) {
        setDisplayedBrand(letters.slice(0, i + 1).join(""));
        i++;
        timer = setTimeout(typeNext, 110);
      } else {
        timer = setTimeout(() => setPhase("holding-brand"), 900);
      }
    };

    typeNext();
    return () => clearTimeout(timer);
  }, [phase]);

  /* ---------- Phase 2: hold brand ---------- */
  useEffect(() => {
    if (phase !== "holding-brand") return;
    const t = setTimeout(() => setPhase("erasing-brand"), 200);
    return () => clearTimeout(t);
  }, [phase]);

  /* ---------- Phase 3: erase brand ---------- */
  useEffect(() => {
    if (phase !== "erasing-brand") return;

    let j = displayedBrand.length;
    let timer: NodeJS.Timeout;

    const erase = () => {
      if (j > 0) {
        j--;
        setDisplayedBrand(BRAND.slice(0, j));
        timer = setTimeout(erase, 55);
      } else {
        timer = setTimeout(() => setPhase("taglines"), 350);
      }
    };

    erase();
    return () => clearTimeout(timer);
  }, [phase, displayedBrand]);

  /* ---------- Phase 4: cycle shuffled taglines ---------- */
  useEffect(() => {
    if (phase !== "taglines") return;

    const current = SEQUENCE[taglineIndex % SEQUENCE.length];
    const letters = current.split("");
    let i = 0;
    let typeTimer: NodeJS.Timeout;
    let eraseTimer: NodeJS.Timeout;
    let nextTimer: NodeJS.Timeout;

    // Type in
    const typeIn = () => {
      if (i < letters.length) {
        setDisplayedTagline(letters.slice(0, i + 1).join(""));
        i++;
        typeTimer = setTimeout(typeIn, 55);
      } else {
        // Short hold — phrases are only 3 words, read instantly
        eraseTimer = setTimeout(typeOut, 1100);
      }
    };

    // Erase
    let j = letters.length;
    const typeOut = () => {
      if (j > 0) {
        j--;
        setDisplayedTagline(letters.slice(0, j));
        eraseTimer = setTimeout(typeOut, 22);
      } else {
        nextTimer = setTimeout(() => {
          setTaglineIndex((prev) => prev + 1);
        }, 350);
      }
    };

    typeIn();

    return () => {
      clearTimeout(typeTimer);
      clearTimeout(eraseTimer);
      clearTimeout(nextTimer);
    };
  }, [phase, taglineIndex, SEQUENCE]);

  const borderColors =
    theme === "dark"
      ? "border-t-red-500 border-r-yellow-500 border-b-green-500 border-l-blue-500"
      : "border-t-red-400 border-r-yellow-400 border-b-green-400 border-l-blue-400";

  const currentGradient =
    TAGLINE_GRADIENTS[taglineIndex % TAGLINE_GRADIENTS.length];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full gap-6 overflow-hidden bg-transparent">
      {/* Spinning Loader */}
      <div className="relative flex items-center justify-center h-24 w-24">
        <div
          className={`animate-spin rounded-full h-24 w-24 ${borderColors} border-8`}
        />
      </div>

      {/* === PHASE 1–3: BRAND === */}
      {phase !== "taglines" && (
        <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-widest min-h-[1.2em]">
          {displayedBrand}
          <span className="animate-blink text-gray-900 dark:text-white">|</span>
        </h1>
      )}

      {/* === PHASE 4: TAGLINES === */}
      {phase === "taglines" && (
        <h1
          className={`text-lg md:text-xl font-extrabold tracking-widest bg-gradient-to-r ${currentGradient} bg-clip-text text-transparent min-h-[1.2em] transition-all duration-300 text-center px-4`}
        >
          {displayedTagline}
          <span className="animate-blink text-gray-900 dark:text-white">|</span>
        </h1>
      )}
    </div>
  );
}