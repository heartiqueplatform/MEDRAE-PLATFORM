"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Play, BookOpen, Shuffle, Compass, ChevronRight, ClipboardCheck, CheckCircle2, Trophy, Zap, Lock, Sparkles, Search, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useUnitQuestionCount } from "@/hooks/useUnitQuestionCount";
import { useState } from "react";
import { useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { TermsButton } from "@/components/ui/TermsButton";
//  Popup component
const PopupMessage = ({ message, onClose }: { message: string; onClose: () => void }) => {
  return (
    <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce z-50">
      {message}
      <button className="ml-3 text-sm underline" onClick={onClose}>
        Close
      </button>
    </div>
  );
};
const hasStartedQuiz = (unitCode: string) => {
  const startedUnits = JSON.parse(localStorage.getItem("startedUnits") || "[]");
  return startedUnits.includes(unitCode);
};

const markUnitStarted = (unitCode: string) => {
  const startedUnits = JSON.parse(localStorage.getItem("startedUnits") || "[]");
  if (!startedUnits.includes(unitCode)) {
    startedUnits.push(unitCode);
    localStorage.setItem("startedUnits", JSON.stringify(startedUnits));
  }
};

const paperOneUnits = [
  { code: "HNX1-01", title: "Anatomy and Physiology", level: "Beginner" },
  { code: "HNX1-02", title: "Medical-Surgical Nursing", level: "Intermediate" },
  { code: "HNX1-03", title: "Fundamentals of Nursing and Patient Care", level: "Beginner" },
  { code: "HNX1-04", title: "Pharmacology", level: "Intermediate" },
  { code: "HNX1-05", title: "Pediatrics & Neonatal Care (MCH)", level: "Advanced" },
  { code: "HNX1-06", title: "Immunology & Infectious Disease", level: "Intermediate" },
  { code: "HNX1-07", title: "Endocrine # MED-SURG", level: "Advanced" },
  { code: "HNX1-08", title: "Neurology # MED-SURG", level: "Advanced" },
  { code: "HNX1-09", title: "Cardiovascular (CVD) # MED-SURG", level: "Advanced" },
  { code: "HNX1-010", title: "Respiratory # MED-SURG", level: "Intermediate" },
  { code: "HNX1-011", title: "Gastrointestinal GIT #MED-SURG", level: "Intermediate" },
  { code: "HNX1-012", title: "Obstetric", level: "Intermediate" },
  { code: "HNX1-013", title: "Genito-Urinary System #MED-SURG", level: "Advanced" },
  { code: "HNX1-014", title: "Hematology & Oncology # MED-SURG", level: "Intermediate" },
  { code: "HNX1-015", title: "Orthopedics & Integumentary", level: "Advanced" },
  { code: "HNX1-016", title: "Sensory ENT # MED-SURG", level: "Beginner" },
  { code: "HNX1-017", title: "Gynecology #OBS", level: "Intermediate" },
  { code: "HNX1-018", title: "Microbiology", level: "Beginner" },
  { code: "HNX1-019", title: "First Aid, Trauma & Emergency", level: "Intermediate" },
  { code: "HNX1-020", title: "Baby at Risk", level: "Intermediate" },
  { code: "HNX1-021", title: "Ophthalmology", level: "Beginner" },
  { code: "HNX1-022", title: "Theater Nursing", level: "Intermediate" },
  { code: "HNX1-023", title: "Palliative Care", level: "Beginner" },
  { code: "HNX1-024", title: "Intensive Care Unit Nursing", level: "Advanced" },
  { code: "HNX1-025", title: "Dermatology", level: "Beginner" },
  { code: "HNX1-026", title: "Dental, Alimentary, and Biliary Disorders", level: "Intermediate" },
];

const paperTwoUnits = [
  { code: "HNX2-01", title: "Community Health", level: "Beginner" },
  { code: "HNX2-02", title: "Leadership & Management", level: "Intermediate" },
  { code: "HNX2-03", title: "Research & Statistics", level: "Advanced" },
  { code: "HNX2-04", title: "Mental Health & Psychiatric Nursing", level: "Advanced" },
  { code: "HNX2-05", title: "Psychiatric & Mental Health Nursing", level: "Intermediate" },
  { code: "HNX2-06", title: "Immunization & KEPI", level: "Beginner" },
  { code: "HNX2-07", title: "Nutrition", level: "Beginner" },
  { code: "HNX2-08", title: "Family Planning", level: "Beginner" },
  { code: "HNX2-09", title: "Communicable Diseases & VBD", level: "Intermediate" },
  { code: "HNX2-010", title: "HIV & AIDS / STI", level: "Intermediate" },
  { code: "HNX2-011", title: "Sociology and Anthropology", level: "Beginner" },
  { code: "HNX2-012", title: "IMNC Peads", level: "Intermediate" },
  { code: "HNX2-013", title: "Community Diagnosis", level: "Intermediate" },
  { code: "HNX2-014", title: "Primary Healthcare & Community Strategies", level: "Intermediate" },
  { code: "HNX2-015", title: "Nursing Ethics & Legal Aspects", level: "Beginner" },
  { code: "HNX2-016", title: "Abnormal Midwifery", level: "Advanced" },
  { code: "HNX2-017", title: "Normal Midwifery", level: "Intermediate" },
  { code: "HNX2-018", title: "Special Needs People", level: "Beginner" },
  { code: "HNX2-019", title: "Psychology", level: "Beginner" },
  { code: "HNX2-020", title: "Health System Management", level: "Intermediate" },
  { code: "HNX2-021", title: "Teaching Methodology", level: "Beginner" },
];

const paperThreeUnits = [
  { code: "HNX3-001", title: "Management of Care (NCLEX)", level: "Professional" },
  { code: "HNX3-002", title: "Safety and Infection Control  (NCLEX)", level: "Professional" },
  { code: "HNX3-003", title: "Health Promotion and Maintenance  (NCLEX)", level: "Foundation" },
  { code: "HNX3-004", title: "Psychosocial Integrity  (NCLEX)", level: "Professional" },
  { code: "HNX3-005", title: "Basic Care and Comfort  (NCLEX)", level: "Foundation" },
  { code: "HNX3-006", title: "Pharmacological and Parenteral Therapies  (NCLEX)", level: "Professional" },
  { code: "HNX3-007", title: "Reduction of Risk Potential  (NCLEX)", level: "Professional" },
  { code: "HNX3-008", title: "Physiological Adaptation  (NCLEX)", level: "Expert" },
];
const paperFourUnits = [
  { code: "FP-01", title: "2026 Newest Mock Paper 1", level: "Professional" },
  { code: "FP-02", title: "2026 Newest Practice Paper 2", level: "Professional" },
  { code: "FP-03", title: "PP1 FQE PRACTICE PAPER 1", level: "Professional" },
  { code: "FP-04", title: "NCK 001", level: "Professional" },
  { code: "FP-04", title: "NCK 001", level: "Professional" },
];


const getLevelVariant = (level: string) => {
  switch (level.toLowerCase()) {
    case "beginner":
      return "default";
    case "intermediate":
      return "secondary";
    case "advanced":
      return "destructive";
    default:
      return "outline";
  }
};



export function MedraeQuizzes() {
  const user = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const navigate = useNavigate();

  const [freeUnits, setFreeUnits] = useState<string[]>([]);

  // Check user subscription
  useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("plan_type, expires_at, is_active")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.is_active) {
          setIsPremium(true);
          localStorage.setItem("subscriptionStatus", JSON.stringify({ isPremium: true }));
        } else {
          // only set false if we could actually fetch data
          setIsPremium(false);
          localStorage.setItem("subscriptionStatus", JSON.stringify({ isPremium: false }));
        }
      } catch (err) {
        console.log("Offline mode: using cached subscription", err);
        // fallback to localStorage if offline
        const cachedSubscription = localStorage.getItem("subscriptionStatus");
        if (cachedSubscription) {
          setIsPremium(JSON.parse(cachedSubscription).isPremium);
        }
      } finally {
        setSubscriptionChecked(true);
      }
    };

    fetchSubscription();
  }, [user]);


  // 🔴 Realtime subscription for subscription changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("subscription_changes_channel")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Realtime subscription update:", payload);
          // re-check subscription immediately
          (async () => {
            const { data } = await supabase
              .from("subscriptions")
              .select("plan_type, expires_at, is_active")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(); // Use maybeSingle() if you expect 0 or 1 result
            if (data?.is_active) {
              setIsPremium(true);
              localStorage.setItem("subscriptionStatus", JSON.stringify({ isPremium: true }));
            } else {
              setIsPremium(false);
              localStorage.setItem("subscriptionStatus", JSON.stringify({ isPremium: false }));
            }

          })();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  // Fetch free units
  // Load free units from localStorage first
  useEffect(() => {
    const cachedFreeUnits = localStorage.getItem("freeUnits");

    if (cachedFreeUnits) {
      // Use cached free units immediately (works offline)
      setFreeUnits(JSON.parse(cachedFreeUnits));
    }

    // Always attempt to fetch from Supabase, but fail gracefully if offline
    const fetchFreeUnits = async () => {
      try {
        const { data } = await supabase
          .from("quizzes")
          .select("unit_code, is_free")
          .eq("is_active", true);

        if (data) {
          const free = data.filter((q) => q.is_free).map((q) => q.unit_code?.trim());
          setFreeUnits(free);
          localStorage.setItem("freeUnits", JSON.stringify(free));
        }
      } catch (err) {
        console.log("Offline mode: using cached free units", err);
        // Do nothing, cachedFreeUnits is already used above
      }
    };

    fetchFreeUnits();
  }, []);


  // 🔴 Realtime subscription for quiz changes (free/locked)
  useEffect(() => {
    const channel = supabase
      .channel("quiz_changes_channel")
      .on(
        "postgres_changes",
        {
          event: "*", // listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "quizzes",
        },
        (payload) => {
          console.log("Realtime quiz update:", payload);
          // re-fetch free units immediately
          (async () => {
            const { data } = await supabase
              .from("quizzes")
              .select("unit_code, is_free")
              .eq("is_active", true);

            if (data) {
              const free = data.filter((q) => q.is_free).map((q) => q.unit_code?.trim());
              setFreeUnits(free);
              localStorage.setItem("freeUnits", JSON.stringify(free));
            }

          })();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const { data: unitCounts, loading, incrementCount } = useUnitQuestionCount();
  // ✅ Stable cached question counts (single source of truth for UI)
  const [cachedCounts, setCachedCounts] = useState<Record<string, number>>({});

  // ✅ Check if question counts already exist locally
  const [hasLocalCache, setHasLocalCache] = useState(false);

  // ✅ Load cached question counts ONCE on mount
  useEffect(() => {
    const stored = localStorage.getItem("cachedCounts");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCachedCounts(parsed);
        setHasLocalCache(true);
      } catch {
        console.warn("Invalid cachedCounts in localStorage");
      }
    }
  }, []);

  useEffect(() => {
    const cachedCounts = localStorage.getItem("cachedCounts");
    if (cachedCounts) {
      setHasLocalCache(true);
    }
  }, []);

  // 🔴 Realtime subscription for question count updates
  // ✅ Lightweight realtime: just trigger refresh (no local writes here)
  useEffect(() => {
    const channel = supabase
      .channel("question_changes_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
        },
        () => {
          // Let the hook update unitCounts → Step 3 will diff + persist
          incrementCount("");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incrementCount]);
  const [showDescription, setShowDescription] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ PURE reader — safe during render
  const getQuestionCount = (code: string) => {
    return cachedCounts[code] ?? 0;
  };

  // ✅ Background sync: Supabase → state → localStorage (ONLY if changed)
  useEffect(() => {
    if (!unitCounts || unitCounts.length === 0) return;

    setCachedCounts((prev) => {
      const next: Record<string, number> = { ...prev };
      let changed = false;

      for (const u of unitCounts) {
        const code = u.unit_code?.trim();
        if (!code) continue;

        const newCount = u.count ?? 0;
        if (next[code] !== newCount) {
          next[code] = newCount;
          changed = true;
        }
      }

      // 🚫 Nothing changed → do NOTHING
      if (!changed) return prev;

      // ✅ Persist only when something actually changed
      localStorage.setItem("cachedCounts", JSON.stringify(next));
      return next;
    });
  }, [unitCounts]);


  const totalPaperOne = paperOneUnits.reduce((sum, unit) => sum + getQuestionCount(unit.code), 0);
  const totalPaperTwo = paperTwoUnits.reduce((sum, unit) => sum + getQuestionCount(unit.code), 0);
  const totalPaperThree = paperThreeUnits.reduce(
    (sum, unit) => sum + getQuestionCount(unit.code),
    0
  );
  const totalPaperFour = paperFourUnits.map((unit) => ({
    ...unit,
    totalQuestions: cachedCounts[unit.code] || 0,
  }));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await incrementCount("");
      setPopup(" Woohoo! All unit question counts have been refreshed successfully and are now fully up to date.");
    } catch (err) {
      console.error(err);
      setPopup(" Unable to refresh question counts. Please check your network connection and try again.");
    }
    setRefreshing(false);
  };
  // Check localStorage for cached subscription
  useEffect(() => {
    const cachedSubscription = localStorage.getItem("subscriptionStatus");
    if (cachedSubscription) {
      const parsed = JSON.parse(cachedSubscription);
      setIsPremium(parsed.isPremium);
      setSubscriptionChecked(true);
    }
  }, []);

  // After fetching subscription, save to localStorage
  useEffect(() => {
    if (subscriptionChecked) {
      localStorage.setItem(
        "subscriptionStatus",
        JSON.stringify({ isPremium })
      );
    }
  }, [isPremium, subscriptionChecked]);
  const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
    return (
      <div className="relative group flex items-center justify-center">
        {children}

        {/* Tooltip */}
        <div
          className="
          absolute bottom-full mb-2
          hidden group-hover:block
          whitespace-nowrap
          px-2 py-1 text-xs rounded-md
          shadow-lg z-50
          left-1/2 -translate-x-1/2
          max-w-[90vw] sm:max-w-xs
          break-words

          bg-white text-gray-900 border border-gray-200
          dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700
        "
        >
          {text}
        </div>
      </div>
    );
  };
  // Only show loader if new user and no cached subscription
  if (!subscriptionChecked && !localStorage.getItem("subscriptionStatus")) {
    return <GlobalLoader />;
  }


  return (
    <div className="min-h-screen w-full flex flex-col items-center ">
      <div className="w-full max-w-3xl space-y-2 px-0 sm:px-6  pt-4 sm:pt-8">

        {/* Popup Notification */}
        {popup && <PopupMessage message={popup} onClose={() => setPopup(null)} />}

        {/* HERO HEADER CARD */}
        <Card className="relative overflow-hidden shadow-xl shadow-blue-500/5 transition-all rounded-none sm:rounded-[2rem] border-0 bg-white dark:bg-gray-900">

          {/* Subtle Background Decoration */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <Heart className="h-7 w-7 text-red-500 animate-pulse" fill="currentColor" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                  Quiz <span className="text-blue-600">Bank</span>
                </CardTitle>
                <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-[0.2em] mt-1.5">
                  NCK & NCLEX Prep
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-2">
            {/* Collapsible Description Box */}
            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <motion.div layout>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  Explore NCK/NCLEX-aligned quizzes for all core nursing units. Curated to reflect the latest syllabus
                  and avoid unnecessary repetition...
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="text-blue-600 dark:text-blue-400 font-bold ml-1 hover:underline underline-offset-4 inline-flex items-center gap-1 transition-all"
                  >
                    {showDescription ? "Show less" : "Learn more"}
                  </button>
                </p>

                <AnimatePresence>
                  {showDescription && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-3 border-t border-gray-200/50 dark:border-gray-700/50 mt-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          These quizzes mirror the structure of actual NCK assessments. Read each question carefully
                          and pay attention to the rationales provided.
                        </p>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" /> Finish quiz to unlock submission
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                            <CheckCircle2 className="w-4 h-4" /> Progress saved locally to your device
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* SEARCH BAR SECTION */}
            <div className="relative w-full group">
              {/* Magnifying Glass Icon */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-focus-within:scale-110">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>

              <input
                type="text"
                placeholder="Search papers, units or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-12 pr-28 rounded-2xl bg-gray-100 dark:bg-gray-900 border-2 border-transparent
              text-gray-900 dark:text-white placeholder-gray-400 font-medium
              focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10
              transition-all duration-300 outline-none shadow-inner"
              />

              {/* Floating Utility Buttons */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-6">
                <Tooltip text="Random">
                  <button
                    onClick={() => {
                      const allUnits = [...paperOneUnits, ...paperTwoUnits];
                      const randomUnit = allUnits[Math.floor(Math.random() * allUnits.length)];
                      navigate(`/quiz?unit=${encodeURIComponent(randomUnit.title)}`);
                    }}
                    className="p-2.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-90"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                </Tooltip>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

                <Tooltip text="Recommend">
                  <button
                    onClick={() => {
                      const pastUnits = JSON.parse(localStorage.getItem("submittedUnits") || "[]");
                      let recommendedUnit;
                      const allUnits = [...paperOneUnits, ...paperTwoUnits];

                      if (pastUnits.length > 0) {
                        recommendedUnit = allUnits.find((u) => !pastUnits.includes(u.code));
                      }
                      if (!recommendedUnit) {
                        recommendedUnit = allUnits[Math.floor(Math.random() * allUnits.length)];
                      }
                      if (recommendedUnit) {
                        navigate(`/quiz?unit=${encodeURIComponent(recommendedUnit.title)}`);
                      }
                    }}
                    className="p-2.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-90"
                  >
                    <Compass className="w-5 h-5" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </CardContent>


          {/* PAPER ONE SECTION */}
          <div className="space-y-2">
            {/* SECTION HEADER */}
            <div className="flex items-end justify-between px-2 sm:px-0 mt-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2">
                  <div className="w-2 h-8 bg-amber-500 rounded-full" />
                  Paper 1: Core Sciences
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Foundational Nursing Units
                </p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {totalPaperOne} Questions Total
                </span>
              </div>
            </div>

            {/* UNITS GRID */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 w-full">
              {(!hasLocalCache
                ? paperOneUnits
                : paperOneUnits.filter((unit) =>
                  unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  unit.code.toLowerCase().includes(searchTerm.toLowerCase())
                )
              ).map((unit, index) =>
                !hasLocalCache ? (
                  /* PRO SKELETON LOADER */
                  <div key={index} className="h-40 w-full rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse border border-transparent" />
                ) : (
                  /* UNIT CARD */
                  <Card
                    key={unit.code}
                    className="group relative overflow-hidden transition-all duration-300 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 hover:border-amber-400 dark:hover:border-amber-500/50 bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl hover:shadow-amber-500/5"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform">
                          <BookOpen className="h-5 w-5 text-amber-600" />
                        </div>

                        {/* STATUS BADGE */}
                        {isPremium ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                          </div>
                        ) : freeUnits.includes(unit.code.trim()) ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                            <Sparkles className="w-3 h-3" /> FREE
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                            <Lock className="w-3 h-3" /> PREMIUM
                          </div>
                        )}
                      </div>

                      <CardTitle className="text-lg font-bold leading-tight mt-3 text-gray-900 dark:text-gray-100">
                        {unit.title}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        {unit.code}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex flex-col gap-4">
                        {/* META INFO */}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none font-bold">
                            {cachedCounts[unit.code] || 0} Questions
                          </Badge>
                          <Badge
                            variant={getLevelVariant(unit.level)}
                            className="font-bold border-none"
                          >
                            {unit.level}
                          </Badge>
                        </div>

                        {/* ACTION BUTTON */}
                        {isPremium || freeUnits.includes(unit.code.trim()) ? (
                          <Link
                            to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                            onClick={() => {
                              markUnitStarted(unit.code);
                              playSound("start");
                              if (navigator.vibrate) navigator.vibrate(50);
                            }}
                            className="block w-full"
                          >
                            <Button
                              className={`w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                      ${hasStartedQuiz(unit.code)
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                                  : "bg-gray-200 dark:bg-gray-900 text-black dark:text-white hover:opacity-90 shadow-lg shadow-gray-200 dark:shadow-none"
                                }`}
                            >
                              {hasStartedQuiz(unit.code) ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                                  Continue Practicing
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 fill-current" />
                                  Start Practice
                                </>
                              )}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 font-bold"
                            variant="outline"
                            disabled
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Locked for Pro
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
          {/* PAPER TWO SECTION */}
          <div className="space-y-2">
            {/* SECTION HEADER */}
            <div className="flex items-end justify-between px-2 sm:px-0 mt-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-500 flex items-center gap-2">
                  <div className="w-2 h-8 bg-blue-600 rounded-full" />
                  Paper 2: Community & Management
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Leadership, Research & Community Health
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                  {totalPaperTwo} Questions Total
                </span>
              </div>
            </div>

            {/* UNITS GRID */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 w-full">
              {(!hasLocalCache
                ? paperTwoUnits
                : paperTwoUnits.filter((unit) =>
                  unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  unit.code.toLowerCase().includes(searchTerm.toLowerCase())
                )
              ).map((unit, index) =>
                !hasLocalCache ? (
                  /* SKELETON LOADER */
                  <div key={index} className="h-40 w-full rounded-[2rem] bg-gray-200 dark:bg-gray-800 animate-pulse" />
                ) : (
                  /* UNIT CARD */
                  <Card
                    key={unit.code}
                    className="group relative overflow-hidden transition-all duration-300 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500/50 bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl hover:shadow-blue-500/5"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                        </div>

                        {/* STATUS INDICATORS */}
                        <div className="flex flex-col items-end gap-1">
                          {isPremium ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                            </div>
                          ) : freeUnits.includes(unit.code.trim()) ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                              <Sparkles className="w-3 h-3" /> FREE
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                              <Lock className="w-3 h-3" /> PREMIUM
                            </div>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-lg font-bold leading-tight mt-3 text-gray-900 dark:text-gray-100 min-h-[3rem] line-clamp-2">
                        {unit.title}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        {unit.code}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex flex-col gap-4">
                        {/* UNIT STATS PILLS */}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none font-bold">
                            {cachedCounts[unit.code] ?? 0} Questions
                          </Badge>
                          <Badge
                            variant={getLevelVariant(unit.level)}
                            className="font-bold border-none"
                          >
                            {unit.level}
                          </Badge>
                        </div>

                        {/* ACTION BUTTON LOGIC */}
                        {isPremium || freeUnits.includes(unit.code.trim()) ? (
                          <Link
                            to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                            onClick={() => {
                              markUnitStarted(unit.code);
                              playSound("start");
                              if (navigator.vibrate) navigator.vibrate(50);
                            }}
                            className="block w-full"
                          >
                            <Button
                              className={`w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2
                      ${hasStartedQuiz(unit.code)
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                                }`}
                            >
                              {hasStartedQuiz(unit.code) ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                                  Continue Quiz
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 fill-current" />
                                  Start Practice
                                </>
                              )}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 font-bold"
                            variant="outline"
                            disabled
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Upgrade to Access
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
          {/* PAPER FOUR SECTION - FULL MOCK PAPERS */}
          <div className="space-y-2">
            {/* SECTION HEADER */}
            <div className="flex items-end justify-between px-2 sm:px-0 mt-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                  <div className="w-2 h-8 bg-emerald-600 rounded-full" />
                  Full Practice Papers
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  2026 Updated Full-Length Mock Exams
                </p>
              </div>
              <div className="bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {totalPaperFour.reduce((sum, unit) => sum + unit.totalQuestions, 0)} Total Qs
                </span>
              </div>
            </div>

            {/* UNITS GRID */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 w-full">
              {(!hasLocalCache
                ? paperFourUnits
                : paperFourUnits.filter((unit) =>
                  unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  unit.code.toLowerCase().includes(searchTerm.toLowerCase())
                )
              ).map((unit, index) =>
                !hasLocalCache ? (
                  /* SKELETON LOADER */
                  <div key={index} className="h-44 w-full rounded-[2rem] bg-gray-200 dark:bg-gray-800 animate-pulse" />
                ) : (
                  /* FULL PAPER CARD */
                  <Card
                    key={unit.code}
                    className="group relative overflow-hidden transition-all duration-300 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5"
                  >
                    {/* Subtle "New" Badge for Mocks */}
                    <div className="absolute -right-8 top-4 rotate-45 bg-emerald-500 text-white text-[10px] font-bold px-10 py-1 shadow-sm">
                      NEW
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl group-hover:bg-emerald-100 transition-colors">
                          <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                        </div>

                        {/* STATUS LOGIC */}
                        <div className="flex flex-col items-end gap-1 pr-4">
                          {isPremium ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                            </div>
                          ) : freeUnits.includes(unit.code.trim()) ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                              <Sparkles className="w-3 h-3" /> FREE
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                              <Lock className="w-3 h-3" /> PREMIUM
                            </div>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-lg font-bold leading-tight mt-3 text-gray-900 dark:text-gray-100 pr-6">
                        {unit.title}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold tracking-widest text-emerald-600/70 uppercase">
                        {unit.code}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex flex-col gap-4">
                        {/* MOCK STATS */}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none font-bold">
                            {unit.totalQuestions} Questions
                          </Badge>
                          <Badge
                            className={`border-none font-bold
                    ${unit.level.toLowerCase() === "professional"
                                ? "bg-teal-500 text-white"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                          >
                            {unit.level}
                          </Badge>
                        </div>

                        {/* ACTION BUTTON */}
                        {isPremium || freeUnits.includes(unit.code.trim()) ? (
                          <Link
                            to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                            onClick={() => {
                              markUnitStarted(unit.code);
                              playSound("start");
                              if (navigator.vibrate) navigator.vibrate(50);
                            }}
                            className="block w-full"
                          >
                            <Button
                              className={`w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg
                      ${hasStartedQuiz(unit.code)
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-gray-200 dark:bg-gray-900 text-black dark:text-white hover:opacity-90"
                                }`}
                            >
                              {hasStartedQuiz(unit.code) ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                                  Continue Mock
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 fill-current" />
                                  Take Exam
                                </>
                              )}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 font-bold bg-transparent"
                            variant="outline"
                            disabled
                          >
                            <Lock className="w-3 h-3 mr-2" />
                            Locked Mock
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
          {/* PAPER THREE SECTION - NCLEX MASTERY */}
          <div className="space-y-2">
            {/* SECTION HEADER */}
            <div className="flex items-end justify-between px-2 sm:px-0 mt-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                  <div className="w-2 h-8 bg-purple-600 rounded-full" />
                  Paper 3: NCLEX Mastery
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  International Nursing Standards & RN Prep
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-400 font-mono">
                  {totalPaperThree} Questions
                </span>
              </div>
            </div>

            {/* UNITS GRID */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 w-full">
              {(!hasLocalCache
                ? paperThreeUnits
                : paperThreeUnits.filter((unit) =>
                  unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  unit.code.toLowerCase().includes(searchTerm.toLowerCase())
                )
              ).map((unit, index) =>
                !hasLocalCache ? (
                  /* SKELETON LOADER */
                  <div key={index} className="h-44 w-full rounded-[2rem] bg-gray-200 dark:bg-gray-800 animate-pulse" />
                ) : (
                  /* NCLEX UNIT CARD */
                  <Card
                    key={unit.code}
                    className="group relative overflow-hidden transition-all duration-300 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500/50 bg-white dark:bg-gray-800 shadow-sm hover:shadow-xl hover:shadow-purple-500/5"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                          <Trophy className="h-5 w-5 text-purple-600" />
                        </div>

                        {/* PREMIUM STATUS TAG */}
                        <div className="flex flex-col items-end gap-1">
                          {isPremium ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" /> UNLOCKED
                            </div>
                          ) : freeUnits.includes(unit.code.trim()) ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                              <Sparkles className="w-3 h-3" /> FREE
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                              <Lock className="w-3 h-3" /> PREMIUM
                            </div>
                          )}
                        </div>
                      </div>

                      <CardTitle className="text-lg font-bold leading-tight mt-3 text-gray-900 dark:text-gray-100 min-h-[3rem] line-clamp-2">
                        {unit.title}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-bold tracking-widest text-purple-500/70 uppercase">
                        {unit.code}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="flex flex-col gap-4">
                        {/* MASTERY LEVEL PILLS */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none font-bold">
                            {cachedCounts[unit.code] ?? 0} Qs
                          </Badge>

                          {/* UPGRADED LEVEL LOGIC */}
                          <Badge
                            className={`border-none font-bold text-[10px] uppercase tracking-tighter
                    ${unit.level.toLowerCase() === "foundation"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                                : unit.level.toLowerCase() === "professional"
                                  ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                              }`}
                          >
                            {unit.level}
                          </Badge>
                        </div>

                        {/* ACTION BUTTON */}
                        {isPremium || freeUnits.includes(unit.code.trim()) ? (
                          <Link
                            to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                            onClick={() => {
                              markUnitStarted(unit.code);
                              playSound("start");
                              if (navigator.vibrate) navigator.vibrate(50);
                            }}
                            className="block w-full"
                          >
                            <Button
                              className={`w-full h-12 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg
                      ${hasStartedQuiz(unit.code)
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50"
                                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200/50 dark:shadow-none"
                                }`}
                            >
                              {hasStartedQuiz(unit.code) ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                                  Resume Mastery
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 fill-current text-amber-300" />
                                  Start NCLEX Prep
                                </>
                              )}
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            className="w-full h-12 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 font-bold bg-transparent"
                            variant="outline"
                            disabled
                          >
                            <Lock className="w-3 h-3 mr-2" />
                            Upgrade to Mastery
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
          {/* PROGRESS & SYNC FOOTER */}
          <Card className="mt-12 mb-8 overflow-hidden rounded-[2rem] border-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Your Journey
                </CardTitle>

                {/* Live Sync Indicator */}
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                    Cloud Synced
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-inner">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  You are securely connected to <span className="font-bold text-gray-900 dark:text-white">Supabase Cloud</span>.
                  Your quiz progress, scores, and custom notes are being tracked in real-time.
                </p>

                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Ready to see your results?</span>
                  <Link
                    to="/progress"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Study Progress <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Terms and Legal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-4">
                  <TermsButton />
                </div>

              </div>
            </CardContent>
          </Card>
        </Card>
      </div>

    </div>

  );
}
