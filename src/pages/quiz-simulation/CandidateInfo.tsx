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
  AlertCircle
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
        .select("*")
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-none shadow-xl">
          <CardContent className="p-8 space-y-6">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className={`h-16 w-full ${i === 1 ? 'md:col-span-2' : ''}`} />
              ))}
            </div>
            <Skeleton className="h-12 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-2">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Data Synchronization Failed</h2>
        <p className="text-slate-500 mb-6">Could not load your candidate profile.</p>
        <Button onClick={() => window.location.reload()} variant="outline">Retry Sync</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-2xl border-none shadow-2xl bg-white dark:bg-muted/30 overflow-hidden">
        {/* Decorative Progress/Security Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-400" />

        <CardHeader className="pt-2 pb-2 text-center">
          <div className="mx-auto bg-blue-50 dark:bg-blue-950/40 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transform rotate-3">
            <ShieldCheck className="w-8 h-8 text-blue-600 -rotate-3" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Identity Verification
          </CardTitle>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Confirm your candidate profile to initiate the secure session.
          </p>
        </CardHeader>

        <CardContent className="px-2 md:px-2 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-xl border-0">

            {/* Detail Item: Name */}
            <InfoField
              icon={<User className="w-4 h-4 text-blue-500" />}
              label="Candidate Name"
              value={userData.name}
              fullWidth
            />

            {/* Detail Item: Institution */}
            <InfoField
              icon={<School className="w-4 h-4 text-slate-400" />}
              label="Institution"
              value={userData.institution}
            />

            {/* Detail Item: Course */}
            <InfoField
              icon={<BookOpen className="w-4 h-4 text-slate-400" />}
              label="Program / Course"
              value={userData.course}
            />

            {/* Detail Item: Class */}
            <InfoField
              icon={<Fingerprint className="w-4 h-4 text-slate-400" />}
              label="Block / Class"
              value={userData.block_class}
            />

            {/* Detail Item: NCK Number */}
            <InfoField
              icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
              label="NCK Number"
              value={userData.nck_number}
              highlight
            />
          </div>

          <div className="mt-2 flex justify-center">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-0 px-4 py-1.5 rounded-full flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Identity Confirmed • Ready for Examination
            </Badge>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/80 dark:bg-slate-800/50 border-0 p-8 flex flex-col gap-4">
          <Button
            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-xl shadow-blue-100 group"
            onClick={handleStart}
          >
            Confirm & Start Instructions
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-semibold">
            Secure Exam Environment Powered by proctorium
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// Sub-component for clean organization
function InfoField({ icon, label, value, fullWidth = false, highlight = false }: any) {
  return (
    <div className={`${fullWidth ? 'md:col-span-2' : ''} flex flex-col gap-1.5`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
      </div>
      <div className={`px-4 py-3 rounded-xl border font-semibold text-sm transition-all
        ${highlight
          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-sm'
          : 'bg-white dark:bg-muted/30 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
        {value || "Not Recorded"}
      </div>
    </div>
  );
}