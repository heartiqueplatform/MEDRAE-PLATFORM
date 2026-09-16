"use client";
import { useEffect, useState, useRef } from "react";

const BRAND = "MEDRAE NURSING";

const TAGLINES = [
  // --- Wave 1: Identity anchors the tone ---
  "Think like a nurse.",
  "Antidote for heparin: protamine.",
  "Care starts with knowledge.",
  "Antidote for warfarin: vitamin K.",
  "Built for the bedside.",
  "Antidote for opioids: naloxone.",
  "Become the one they trust.",
  "Antidote for benzos: flumazenil.",

  // --- Wave 2: Identity → Mnemonics ---
  "Every shift starts with study.",
  "ABCDE: Airway, Breathing, Circulation, Disability, Exposure.",
  "For the nurse you're becoming.",
  "OPQRST: Onset, Provocation, Quality, Region, Severity, Time.",
  "Sharp minds. Steady hands.",
  "SAMPLE: Signs, Allergies, Meds, Past, Last meal, Events.",
  "Knowledge. Compassion. Duty.",
  "SOCRATES for pain — location is just the start.",

  // --- Wave 3: Identity → Drug patterns ---
  "Trust your gut. Document everything.",
  "Beta-blockers end in -olol.",
  "Assess, don't assume.",
  "ACE inhibitors end in -pril.",
  "When in doubt, escalate.",
  "ARBs end in -sartan.",
  "If you didn't chart it, you didn't do it.",
  "Statins end in -statin.",

  // --- Wave 4: Identity → High-yield facts ---
  "Every patient is someone's whole world.",
  "Normal saline is 0.9% NaCl.",
  "Hand hygiene saves more lives than any drug.",
  "Blood transfusion: first 15 minutes matter most.",
  "Nursing is a calling — sharpen it daily.",
  "Insulin onset: rapid in 15, regular in 30, NPH in 2h.",
  "The most dangerous word in nursing is 'routine'.",
  "Never ignore new confusion in the elderly.",

  // --- Wave 5: Identity → More antidotes ---
  "Learn. Care. Lead.",
  "Antidote for paracetamol: NAC.",
  "You'll be the one they trust.",
  "Antidote for digoxin: digibind.",
  "Compassion meets competence.",
  "Antidote for iron: deferoxamine.",
  "Study like someone's life depends on it.",
  "Antidote for methotrexate: leucovorin.",

  // --- Wave 6: Identity → More mnemonics ---
  "For the nurse you promised to be.",
  "MONA for chest pain: Morphine, Oxygen, Nitrates, Aspirin.",
  "Practice with purpose.",
  "DKA: fluids first, insulin second, potassium always.",
  "The floor respects the prepared.",
  "Shock: cold, clammy, confused — act fast.",
  "Where good nurses become great.",
  "Pediatric vitals — weight is your guide.",

  // --- Wave 7: Identity → Final facts ---
  "Your patients are waiting.",
  "Potassium: never IV push — always diluted.",
  "Sharp minds heal faster.",
  "Pediatric dose: mg/kg, not just mg.",
  "You don't rise to the occasion — you fall to your training.",
  "Fever in the elderly may be the only sepsis sign.",
  "Become undeniable.",
  "Hypoxia can present as agitation, not cyanosis.",
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
        // Brand fully typed — hold for a beat
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
        // Brand fully erased — begin taglines
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
        typeTimer = setTimeout(typeIn, 38);
      } else {
        // Hold longer so long facts are readable
        eraseTimer = setTimeout(typeOut, 2000);
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
        // Next tagline
        nextTimer = setTimeout(() => {
          setTaglineIndex((prev) => prev + 1);
        }, 300);
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