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
import { Heart, Play, BookOpen, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useUnitQuestionCount } from "@/hooks/useUnitQuestionCount";
import { useState } from "react";
import { useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabaseClient";
import { GlobalLoader } from "@/components/GlobalLoader";
import { useNavigate } from "react-router-dom";
import { playSound } from "@/lib/soundManager";
import CountdownFloating from "@/components/CountdownFloating";
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

  // Only show loader if new user and no cached subscription
  if (!subscriptionChecked && !localStorage.getItem("subscriptionStatus")) {
    return <GlobalLoader message="Checking subscription..." />;
  }


  return (
    <div className="space-y-10 w-full px-2 sm:px-4">

      {popup && <PopupMessage message={popup} onClose={() => setPopup(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 animate-pulse" />
            Medrae Quizzes Bank
          </h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            Explore NCK/NCLEX-aligned quizzes for all core nursing units. Each quiz has been
            carefully curated to reflect the NCLEX and Nursing Council of Kenya (NCK) syllabus, with
            questions thoughtfully selected to avoid unnecessary repetition. This ensures
            broad topic coverage and mirrors the structure of actual NCK assessments.
            Remember  these quizzes are not just for memorizing; they are designed to help
            you understand concepts deeply. Read each question carefully, and pay attention
            to additional points beyond the direct answer.

            <span className="font-semibold text-primary">
              Note: You must finish the quiz to unlock the submit button.
            </span>
            <br />
            <span className="font-semibold text-primary">
              Your quiz progress is saved locally, so you can resume later anytime without losing your work.
            </span>
            <br />For engaging explanations, visuals, and deeper understanding, visit our Medtube Learning Sections.
          </p>
          <Link to="/medtube" className="inline-block mt-4">
            <Button
              variant="outline"
              className="border-blue-500 !text-blue-900 hover:bg-blue-50 active:!text-blue-900 focus:!text-blue-500"
            >
              Visit Medtube Learning Sections
            </Button>
          </Link>

        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 w-full">
        <input
          type="text"
          placeholder="Search all papers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-3 pl-10 rounded-2xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200
               dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:ring-blue-400 dark:focus:border-blue-400"
        />

        <Button
          onClick={() => {
            const allUnits = [...paperOneUnits, ...paperTwoUnits];
            const randomUnit = allUnits[Math.floor(Math.random() * allUnits.length)];
            navigate(`/quiz?unit=${encodeURIComponent(randomUnit.title)}`);
          }}
          variant="outline"
          className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0"
        >
          Surprise Me With a Random Unit
        </Button>

        <Button
          onClick={() => {
            const pastUnits = JSON.parse(localStorage.getItem("submittedUnits") || "[]");
            let recommendedUnit;

            if (pastUnits.length > 0) {
              const allUnits = [...paperOneUnits, ...paperTwoUnits];
              recommendedUnit = allUnits.find((u) => !pastUnits.includes(u.code));
            }

            if (!recommendedUnit) {
              const allUnits = [...paperOneUnits, ...paperTwoUnits];
              recommendedUnit = allUnits[Math.floor(Math.random() * allUnits.length)];
            }

            if (recommendedUnit) {
              navigate(`/quiz?unit=${encodeURIComponent(recommendedUnit.title)}`);
            }
          }}
          variant="outline"
          className="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0"
        >
          Recommended Quiz
        </Button>
      </div>
      <CountdownFloating />

      {/* PAPER FOUR – Full Papers */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-green-600">
          Full Paper Units
          <span className="text-sm text-gray-500">
            ({totalPaperFour.reduce((sum, unit) => sum + unit.totalQuestions, 0)} Questions)
          </span>
        </h2>

        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] w-full">
          {(!hasLocalCache
            ? paperFourUnits
            : paperFourUnits.filter((unit) =>
              unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              unit.code.toLowerCase().includes(searchTerm.toLowerCase())
            )
          ).map((unit, index) =>
            !hasLocalCache ? (
              <div
                key={index}
                className="h-32 w-full rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"
              ></div>
            ) : (
              <Card
                key={index}
                className="border-green-300 shadow-md hover:shadow-lg transition-all rounded-2xl"
              >
                <CardHeader>
                  <CardTitle className="text-md flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    {unit.title}
                  </CardTitle>
                  <CardDescription>{unit.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {unit.totalQuestions} Questions
                      </Badge>
                      <Badge variant="outline" className="text-black">
                        {unit.level}
                      </Badge>

                      {isPremium ? (
                        <Badge variant="default" className="bg-green-600 text-white">
                          Unlocked
                        </Badge>
                      ) : freeUnits.includes(unit.code.trim()) ? (
                        <Badge variant="default" className="bg-green-600 text-white">
                          Free
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          Premium/Pro
                        </Badge>
                      )}
                    </div>

                    {isPremium || freeUnits.includes(unit.code.trim()) ? (
                      <Link
                        to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                        onClick={() => {
                          markUnitStarted(unit.code);
                          playSound("start");
                          if (navigator.vibrate) navigator.vibrate(50);
                        }}
                      >
                        <Button
                          className={`w-auto px-3 py-1 mt-4 whitespace-nowrap flex items-center justify-center text-sm
                      ${hasStartedQuiz(unit.code) ? "bg-green-600 text-white hover:bg-green-700" : ""}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {hasStartedQuiz(unit.code) ? "Continue Practice" : "Start Practice"}
                        </Button>
                      </Link>
                    ) : (
                      <Button className="w-full mt-4" variant="outline" disabled>
                        Premium/Pro Only
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
      {/* PAPER ONE */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-yellow-500">
          NCK PP1 UNITS <span className="text-sm text-gray-500">({totalPaperOne} Questions)</span>
        </h2>
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] w-full">


          {(!hasLocalCache
            ? paperOneUnits : paperOneUnits.filter((unit) =>
              unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              unit.code.toLowerCase().includes(searchTerm.toLowerCase())
            )).map((unit, index) => (
              !hasLocalCache
                ? (

                  <div
                    key={index}
                    className="h-32 w-full rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"
                  ></div>
                ) : (
                  <Card
                    key={index}
                    className="border-yellow-300 shadow-md hover:shadow-lg transition-all rounded-2xl"
                  >
                    <CardHeader>
                      <CardTitle className="text-md flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-yellow-500" />
                        {unit.title}
                      </CardTitle>
                      <CardDescription>{unit.code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {cachedCounts[unit.code] !== undefined
                              ? `${cachedCounts[unit.code]} Questions`
                              : "0 Questions"}
                          </Badge>

                          <Badge variant={getLevelVariant(unit.level)}>{unit.level}</Badge>
                          {isPremium ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              Unlocked
                            </Badge>
                          ) : freeUnits.includes(unit.code.trim()) ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Premium/Pro
                            </Badge>
                          )}
                        </div>

                        {isPremium || freeUnits.includes(unit.code.trim()) ? (
                          <Link
                            to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                            onClick={() => {
                              // Mark the unit as started
                              markUnitStarted(unit.code);

                              // Play start sound
                              playSound("start"); // just call it by name

                              // Vibrate device (50ms)
                              if (navigator.vibrate) {
                                navigator.vibrate(50);
                              }
                            }}
                          >
                            <Button
                              className={`w-auto px-3 py-1 mt-4 whitespace-nowrap flex items-center justify-center text-sm
    ${hasStartedQuiz(unit.code)
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : ""}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {hasStartedQuiz(unit.code) ? "Continue Practice" : "Start Practice"}
                            </Button>
                          </Link>

                        ) : (
                          <Button className="w-full mt-4" variant="outline" disabled>
                            Premium/Pro Only
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
            ))}
        </div>
      </div>


      {/* PAPER TWO */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-blue-600">
          NCK PP2 UNITS <span className="text-sm text-gray-500">({totalPaperTwo} Questions)</span>
        </h2>
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] w-full">
          {(!hasLocalCache
            ? paperTwoUnits : paperTwoUnits.filter((unit) =>
              unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              unit.code.toLowerCase().includes(searchTerm.toLowerCase())
            )).map((unit, index) => (
              !hasLocalCache
                ? (

                  <div
                    key={index}
                    className="h-32 w-full rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"
                  ></div>
                ) : (
                  <Card
                    key={index}
                    className="border-blue-300 shadow-md hover:shadow-lg transition-all rounded-2xl"
                  >
                    <CardHeader>
                      <CardTitle className="text-md flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        {unit.title}
                      </CardTitle>
                      <CardDescription>{unit.code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {cachedCounts[unit.code] !== undefined
                              ? `${cachedCounts[unit.code]} Questions`
                              : "0 Questions"}
                          </Badge>

                          <Badge variant={getLevelVariant(unit.level)}>{unit.level}</Badge>
                          {isPremium ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              Unlocked
                            </Badge>
                          ) : freeUnits.includes(unit.code.trim()) ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Premium/Pro
                            </Badge>
                          )}
                        </div>

                        {isPremium || freeUnits.includes(unit.code.trim()) ? (
                          <Link
                            to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                            onClick={() => {
                              markUnitStarted(unit.code);
                              playSound("start");
                              if (navigator.vibrate) navigator.vibrate(50);
                            }}
                          >
                            <Button
                              className={`w-auto px-3 py-1 mt-4 whitespace-nowrap flex items-center justify-center text-sm
    ${hasStartedQuiz(unit.code)
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : ""}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {hasStartedQuiz(unit.code) ? "Continue Practice" : "Start Practice"}
                            </Button>
                          </Link>
                        ) : (
                          <Button className="w-full mt-4" variant="outline" disabled>
                            Premium/Pro Only
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
            ))}
        </div>
      </div>

      {/* PAPER THREE */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-purple-600">
          NCLEX Mastery Units <span className="text-sm text-gray-500">({totalPaperThree} Questions)</span>
        </h2>
        <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] w-full">


          {(!hasLocalCache
            ? paperThreeUnits : paperThreeUnits.filter((unit) =>
              unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              unit.code.toLowerCase().includes(searchTerm.toLowerCase())
            )).map((unit, index) => (
              !hasLocalCache
                ? (

                  <div
                    key={index}
                    className="h-32 w-full rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"
                  ></div>
                ) : (
                  <Card
                    key={index}
                    className="border-purple-300 shadow-md hover:shadow-lg transition-all rounded-2xl"
                  >
                    <CardHeader>
                      <CardTitle className="text-md flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                        {unit.title}
                      </CardTitle>
                      <CardDescription>{unit.code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {cachedCounts[unit.code] !== undefined
                              ? `${cachedCounts[unit.code]} Questions`
                              : "0 Questions"}
                          </Badge>

                          <Badge
                            variant={
                              unit.level.toLowerCase() === "foundation" ? "default" :
                                unit.level.toLowerCase() === "professional" ? "secondary" :
                                  unit.level.toLowerCase() === "expert" ? "destructive" :
                                    "outline"
                            }
                            className={
                              unit.level.toLowerCase() === "foundation" ? "bg-yellow-400 text-black" :
                                unit.level.toLowerCase() === "professional" ? "bg-teal-500 text-white" :
                                  unit.level.toLowerCase() === "expert" ? "bg-purple-600 text-white" :
                                    ""
                            }
                          >
                            {unit.level}
                          </Badge>

                          {isPremium ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              Unlocked
                            </Badge>
                          ) : freeUnits.includes(unit.code.trim()) ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Premium/Pro
                            </Badge>
                          )}
                        </div>

                        {isPremium || freeUnits.includes(unit.code.trim()) ? (
                          <Link
                            to={`/quiz?unit=${encodeURIComponent(unit.title)}`}
                            onClick={() => {
                              markUnitStarted(unit.code);
                              playSound("start");
                              if (navigator.vibrate) navigator.vibrate(50);
                            }}
                          >
                            <Button
                              className={`w-auto px-3 py-1 mt-4 whitespace-nowrap flex items-center justify-center text-sm
    ${hasStartedQuiz(unit.code)
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : ""}`}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {hasStartedQuiz(unit.code) ? "Continue Practice" : "Start Practice"}
                            </Button>
                          </Link>
                        ) : (

                          <Button className="w-full mt-4" variant="outline" disabled>
                            Premium/Pro Only
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
            ))}
        </div>
      </div>



      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You are Connected to Supabase to track your quiz progress and scores.Visit My study progress page after fully submitting your quiz.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
