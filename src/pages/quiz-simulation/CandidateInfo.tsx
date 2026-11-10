"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  School,
  BookOpen,
  Fingerprint,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { playSound } from "@/lib/soundManager";

const tap = () => {
  playSound("ui-tap");
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
};

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
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
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
    tap();
    navigate("/quiz-simulation/instructions");
  };

  const handleBack = () => {
    tap();
    navigate(-1);
  };

  /* ── Loading ───────────────────────────────────────── */
  if (loading && !userData) {
    return (
      <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
        <Header onBack={handleBack} />
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-md mx-auto px-4 py-4 space-y-2">
            {/* Identity card skeleton */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-3 animate-pulse">
              <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-white/[0.06] mx-auto" />
              <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-white/[0.06] mx-auto" />
              <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-white/[0.06] mx-auto" />
            </div>

            {/* Field rows */}
            <div className="rounded-2xl bg-white dark:bg-[#161b22] p-4 space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-11 rounded-xl bg-slate-100 dark:bg-white/[0.06]"
                />
              ))}
            </div>

            {/* Status pill skeleton */}
            <div className="h-7 w-40 rounded-full bg-slate-100 dark:bg-white/[0.06] mx-auto animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  /* ── Not found ─────────────────────────────────────── */
  if (!userData) {
    return (
      <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
        <Header onBack={handleBack} />
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-14 w-14 rounded-full
                            bg-rose-50 dark:bg-rose-400/10
                            flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Data sync failed
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] leading-snug">
              Could not load your candidate profile.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 h-10 px-4 rounded-xl
                         bg-slate-100 dark:bg-white/[0.06]
                         text-slate-700 dark:text-slate-200
                         text-[12px] font-bold
                         active:scale-[0.97] transition-transform"
              style={{ touchAction: "manipulation" }}
            >
              Retry sync
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* ── Ready ─────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0d1117]">
      <Header onBack={handleBack} />

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <div className="w-full max-w-md mx-auto px-4 py-4 pb-6 space-y-3 safe-bottom">
          {/* Identity card */}
          <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4 text-center space-y-3">
            <div className="h-12 w-12 rounded-xl
                            bg-blue-50 dark:bg-blue-400/10
                            flex items-center justify-center mx-auto">
              <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider
                            text-blue-600 dark:text-blue-400 leading-none mb-1">
                Step 1 of 3
              </p>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Identity verification
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Confirm your profile to begin the simulation.
              </p>
            </div>
          </section>

          {/* Fields card */}
          <section className="rounded-2xl bg-white dark:bg-[#161b22] p-3 space-y-2">
            <InfoField
              icon={<User className="h-3.5 w-3.5" />}
              iconTone="blue"
              label="Candidate name"
              value={userData.name}
            />
            <InfoField
              icon={<School className="h-3.5 w-3.5" />}
              iconTone="slate"
              label="Institution"
              value={userData.institution}
            />
            <InfoField
              icon={<BookOpen className="h-3.5 w-3.5" />}
              iconTone="slate"
              label="Program"
              value={userData.course}
            />
            <InfoField
              icon={<Fingerprint className="h-3.5 w-3.5" />}
              iconTone="slate"
              label="Block"
              value={userData.block}
            />
            <InfoField
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              iconTone="emerald"
              label="NCK number"
              value={userData.nck_number}
              highlight
            />
          </section>

          {/* Status pill */}
          <div className="flex justify-center pt-1">
            <span className="inline-flex items-center gap-1.5
                             bg-emerald-50 dark:bg-emerald-400/10
                             text-emerald-700 dark:text-emerald-400
                             text-[10px] font-bold uppercase tracking-wider
                             px-2.5 py-1 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Identity confirmed · Ready
            </span>
          </div>
          {/* Confirm CTA — sits just under the info */}
          <div className="pt-2">
            <button
              onClick={handleStart}
              className="w-full h-11 rounded-xl
               bg-blue-600 text-white
               text-sm font-bold
               flex items-center justify-center gap-2
               active:scale-[0.97] transition-transform"
              style={{ touchAction: "manipulation" }}
            >
              Confirm & continue
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em]
                text-slate-400 dark:text-slate-500 mt-2">
              Secure exam environment
            </p>
          </div>
        </div>
      </main>

      {/* ── Pinned footer ────────────────────────────────── */}

    </div>
  );
}

/* ── Header ─────────────────────────────────────────── */
function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="shrink-0 flex items-center gap-2 px-2 h-14
                       bg-white dark:bg-[#0d1117]
                       border-b border-slate-200/70 dark:border-white/[0.06]
                       z-30 safe-top">
      <button
        onClick={onBack}
        aria-label="Go back"
        className="h-10 w-10 rounded-full flex items-center justify-center
                   text-slate-700 dark:text-slate-200
                   active:bg-slate-100 dark:active:bg-white/5"
        style={{ touchAction: "manipulation" }}
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold leading-tight truncate
                       text-slate-900 dark:text-white">
          Candidate info
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate">
          Verify your profile
        </p>
      </div>
    </header>
  );
}

/* ── Info row ───────────────────────────────────────── */
function InfoField({
  icon,
  iconTone,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  iconTone: "blue" | "slate" | "emerald";
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  const toneClass = {
    blue: "text-blue-600 dark:text-blue-400",
    slate: "text-slate-400 dark:text-slate-500",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }[iconTone];

  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <div className={`shrink-0 ${toneClass}`}>{icon}</div>

      <p className="shrink-0 w-[90px]
                    text-[9px] font-bold uppercase tracking-wider
                    text-slate-500 dark:text-slate-400 leading-tight">
        {label}
      </p>

      <div
        className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg
                    text-[12px] font-bold truncate tabular-nums
                    ${highlight
            ? "bg-blue-50 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300"
            : "bg-slate-50 dark:bg-[#0d1117] text-slate-700 dark:text-slate-200"
          }`}
      >
        {value || "Not recorded"}
      </div>
    </div>
  );
}