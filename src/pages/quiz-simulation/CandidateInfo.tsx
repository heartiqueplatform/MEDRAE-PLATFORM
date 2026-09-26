"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  User,
  School,
  BookOpen,
  Fingerprint,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function CandidateInfo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const localKey = "candidateInfo";

    const cached = localStorage.getItem(localKey);
    if (cached) {
      setUserData(JSON.parse(cached));
      setLoading(false);
    }

    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("No auth user found");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, institution, course, block, nck_number, role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user:", error.message);
      } else {
        setUserData(data);
        localStorage.setItem(localKey, JSON.stringify(data));
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleStart = () => {
    navigate("/quiz-simulation/instructions");
  };

  if (loading && !userData) {
    return (
      <div className="min-h-[100svh] w-full bg-[#F8FAFC] dark:bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-2/3 mx-auto" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
          <Skeleton className="h-11 w-full mt-3" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-[100svh] w-full flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-background p-4">
        <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          Data Synchronization Failed
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-5 text-center text-sm">
          Could not load your candidate profile.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry Sync
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] w-full bg-[#F8FAFC] dark:bg-background flex flex-col">
      <Card className="w-full max-w-2xl mx-auto md:my-6 rounded-none border-0 shadow-none bg-transparent flex flex-col">
        <CardHeader className="pt-6 pb-2 px-5 md:px-6 text-center flex-shrink-0">
          <div className="mx-auto bg-blue-50 dark:bg-blue-950/40 w-12 h-12 rounded-xl flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Identity Verification
          </CardTitle>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Confirm your profile to begin.
          </p>
        </CardHeader>

        <CardContent className="px-4 md:px-6 pb-2 flex-1">
          <div className="space-y-2">
            <InfoField
              icon={<User className="w-3.5 h-3.5 text-blue-500" />}
              label="Candidate Name"
              value={userData.name}
            />
            <InfoField
              icon={<School className="w-3.5 h-3.5 text-slate-400" />}
              label="Institution"
              value={userData.institution}
            />
            <InfoField
              icon={<BookOpen className="w-3.5 h-3.5 text-slate-400" />}
              label="Program / Course"
              value={userData.course}
            />
            <InfoField
              icon={<Fingerprint className="w-3.5 h-3.5 text-slate-400" />}
              label="Block / Class"
              value={userData.block}
            />
            <InfoField
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
              label="NCK Number"
              value={userData.nck_number}
              highlight
            />
          </div>

          <div className="mt-3 flex justify-center">
            <Badge
              variant="secondary"
              className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-0 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 text-[10px] font-medium"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Identity Confirmed • Ready
            </Badge>
          </div>
        </CardContent>

        <CardFooter className="bg-transparent border-0 px-4 md:px-6 py-3 flex flex-col gap-2 flex-shrink-0">
          <Button
            className="w-full h-11 md:h-12 text-sm md:text-base font-bold bg-blue-600 hover:bg-blue-700 transition-all duration-200 group rounded-lg"
            onClick={handleStart}
          >
            Confirm
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-center text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] font-semibold">
            Secure Exam Environment
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function InfoField({ icon, label, value, highlight = false }: any) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="flex items-center gap-1.5 w-[110px] flex-shrink-0">
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">
          {label}
        </span>
      </div>
      <div
        className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-md text-xs font-semibold truncate
          ${highlight
            ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
            : "bg-slate-100/70 dark:bg-muted/40 text-slate-700 dark:text-slate-200"
          }`}
      >
        {value || "Not Recorded"}
      </div>
    </div>
  );
}