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

export function HeartiqueQuizzes() {
    const user = useUser();
  const [isPremium, setIsPremium] = useState(false);
  const [freeUnits, setFreeUnits] = useState<string[]>([]);

  // Check user subscription
  useEffect(() => {
    if (!user) return;
    const checkSubscription = async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_type, expires_at")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        const stillActive = !data.expires_at || new Date(data.expires_at) > new Date();
        setIsPremium(data.plan_type !== "free" && stillActive);
      }
    };
    checkSubscription();
  }, [user]);

  // Fetch free units
  useEffect(() => {
    const fetchFreeUnits = async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("unit_code, is_free")
        .eq("is_active", true);

      if (!error && data) {
      // Units where is_free = true are free (open)
const free = data.filter((q) => q.is_free).map((q) => q.unit_code?.trim());
        setFreeUnits(free);
      }
    };
    fetchFreeUnits();
  }, []);
  const { data: unitCounts, loading, incrementCount } = useUnitQuestionCount();
  const [refreshing, setRefreshing] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);

  const getQuestionCount = (code: string) => {
    if (!unitCounts || unitCounts.length === 0) return 0;
    return (
      unitCounts.find(
        (u) => u.unit_code?.trim().toLowerCase() === code.trim().toLowerCase()
      )?.count || 0
    );
  };

  const totalPaperOne = paperOneUnits.reduce((sum, unit) => sum + getQuestionCount(unit.code), 0);
  const totalPaperTwo = paperTwoUnits.reduce((sum, unit) => sum + getQuestionCount(unit.code), 0);

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

  return (
    <div className="space-y-10">
      {popup && <PopupMessage message={popup} onClose={() => setPopup(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 animate-pulse" />
            Heartique Quizzes App
          </h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            Explore NCK-aligned quizzes for all core nursing units. Each quiz has been 
            carefully curated to reflect the Nursing Council of Kenya (NCK) syllabus, with 
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
            <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-50">
               Visit Medtube Learning Sections
            </Button>
          </Link>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 transition-transform ${refreshing ? "animate-spin" : ""}`}
        >
          <RefreshCw className="h-4 w-4" />
          {refreshing ? "Refreshing..." : "Refresh Counts"}
        </Button>
      </div>

      {/* PAPER ONE */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-yellow-500">
          PAPER ONE UNITS <span className="text-sm text-gray-500">({totalPaperOne} Questions)</span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {paperOneUnits.map((unit, index) => (
            <Card key={index} className="border-yellow-300 shadow-md hover:shadow-lg transition-all">
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
    {loading ? "..." : `${getQuestionCount(unit.code)} Questions`}
  </Badge>
  <Badge variant={getLevelVariant(unit.level)}>{unit.level}</Badge>
{isPremium || freeUnits.includes(unit.code.trim()) ? (
    <Badge variant="default" className="bg-green-600 text-white">Free</Badge>
) : (
    <Badge variant="outline" className="text-red-600 border-red-600">Premium/Pro</Badge>
)}

</div>

{isPremium || freeUnits.includes(unit.code.trim()) ? (
  <Link to={`/quiz?unit=${encodeURIComponent(unit.title)}`}>
    <Button className="w-full mt-4">
      <Play className="h-4 w-4 mr-2" />
      Start Quiz
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
          ))}
        </div>
      </div>

      {/* PAPER TWO */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-blue-600">
          PAPER TWO UNITS <span className="text-sm text-gray-500">({totalPaperTwo} Questions)</span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {paperTwoUnits.map((unit, index) => (
            <Card key={index} className="border-blue-300 shadow-md hover:shadow-lg transition-all">
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
    {loading ? "..." : `${getQuestionCount(unit.code)} Questions`}
  </Badge>
  <Badge variant={getLevelVariant(unit.level)}>{unit.level}</Badge>
{isPremium || freeUnits.includes(unit.code.trim()) ? (
    <Badge variant="default" className="bg-green-600 text-white">Free</Badge>
) : (
    <Badge variant="outline" className="text-red-600 border-red-600">Premium/Pro</Badge>
)}

</div>
{isPremium || freeUnits.includes(unit.code.trim()) ? (
  <Link to={`/quiz?unit=${encodeURIComponent(unit.title)}`}>
    <Button className="w-full mt-4">
      <Play className="h-4 w-4 mr-2" />
      Start Quiz
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
