// src/pages/dashboard/staff.tsx
"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarDays, Bell, Briefcase, Users, ShieldCheck, BookOpen,
  GraduationCap, Award, Clock, TrendingUp, CheckCircle2, ArrowRight,
  PlayCircle, PenTool, Sparkles, UserCheck,
} from "lucide-react";

import { useDashboardStats } from "@/staff-cpd/hooks";
import { fmtHours, fmtPoints } from "@/staff-cpd/lib";
import { playSound } from "@/lib/soundManager";
import DailyDose from "@/components/DailyDose";
import { useWallet, useStaffProfile } from "@/staff-cpd/lib/contributor-hooks";
import { ContributorEarningsCard } from "@/staff-cpd/components/ContributorEarningsCard";

/* ------------------------------------------------------------------ */
/*  Module-level cache                                                */
/* ------------------------------------------------------------------ */
let cachedUserId: string | null = null;

/* ------------------------------------------------------------------ */
/*  Tap helper                                                        */
/* ------------------------------------------------------------------ */
const vibrate = (p: number | number[] = 15) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(p);
};
const tap = (type: "light" | "success" | "warning" = "light") => {
  try { playSound("ui-tap"); } catch { /* no-op */ }
  if (type === "success") vibrate([15, 30, 15]);
  else if (type === "warning") vibrate(40);
  else vibrate(12);
};

/* ------------------------------------------------------------------ */
/*  Accent maps                                                       */
/* ------------------------------------------------------------------ */
const ICON_BG: Record<string, string> = {
  emerald: "bg-emerald-600 text-white",
  blue: "bg-blue-600 text-white",
  amber: "bg-amber-600 text-white",
  violet: "bg-violet-600 text-white",
  rose: "bg-rose-600 text-white",
  slate: "bg-slate-600 text-white",
};
type Tone = keyof typeof ICON_BG;

/* ═══════════════════════════════════════════════════════════════
   StatTile
   ═══════════════════════════════════════════════════════════════ */
function StatTile({
  label, value, hint, icon: Icon, tone = "blue", to, cta,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ComponentType<any>;
  tone?: Tone;
  to?: string;
  cta?: string;
}) {
  const content = (
    <div className="rounded-2xl bg-white dark:bg-[#161b22] p-3 flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between gap-2">
        <div className={`h-9 w-9 rounded-xl ${ICON_BG[tone]} flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right leading-tight">
          {label}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight tabular-nums">
          {value}
        </p>
        {hint && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-tight">
            {hint}
          </p>
        )}
      </div>
      {to && cta && (
        <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-bold
                         text-blue-600 dark:text-blue-400 uppercase tracking-wider pt-1">
          {cta} <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </div>
  );
  if (to) {
    return (
      <Link to={to} onClick={() => tap()}
        className="block active:scale-[0.99] transition-transform h-full"
        style={{ touchAction: "manipulation" }}>
        {content}
      </Link>
    );
  }
  return content;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function StaffDashboard() {
  const [userId, setUserId] = useState<string | null>(cachedUserId);
  const [license, setLicense] = useState<any>(null);
  const [shiftCount, setShiftCount] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [mentorshipCount, setMentorshipCount] = useState(0);

  const { data: cpdStats, isLoading: cpdLoading } = useDashboardStats();
  const { data: profile, isLoading: profileLoading } = useStaffProfile(userId);
  const { data: cachedWallet } = useWallet(userId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const id = data.session?.user.id ?? null;
      cachedUserId = id;
      setUserId(id);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: licenseData } = await supabase
        .from("staff_licenses").select("*")
        .eq("user_id", userId).eq("status", "active").maybeSingle();
      if (!cancelled) setLicense(licenseData);

      const { data: shifts } = await supabase
        .from("staff_shifts").select("id")
        .eq("user_id", userId).gte("start_time", new Date().toISOString());
      if (!cancelled) setShiftCount(shifts?.length || 0);

      const { data: notif } = await supabase
        .from("staff_notifications").select("id")
        .eq("user_id", userId).eq("is_read", false);
      if (!cancelled) setNotifications(notif?.length || 0);

      const { data: jobs } = await supabase
        .from("staff_jobs").select("id").eq("verified", true).eq("is_active", true);
      if (!cancelled) setJobCount(jobs?.length || 0);

      const { data: mentorship } = await supabase
        .from("staff_mentorship_requests").select("id")
        .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`).eq("status", "active");
      if (!cancelled) setMentorshipCount(mentorship?.length || 0);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const daysUntilExpiry = license
    ? Math.ceil((new Date(license.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const profileSaysContributor = !!profile?.is_verified_contributor;
  const hasCachedWallet = cachedWallet != null;
  const isVerifiedContributor = profileSaysContributor || hasCachedWallet;

  const liveTools = [
    {
      icon: BookOpen, title: "CPD Catalog",
      description: "Browse published CPD activities — videos, podcasts, articles, assessments.",
      cta: "Browse", to: "/cpd/catalog", tone: "emerald" as Tone
    },
    {
      icon: PlayCircle, title: "My CPD Progress",
      description: "Resume learning, see completion percentages, and track in-progress activities.",
      cta: "Continue", to: "/cpd/progress", tone: "blue" as Tone
    },
    {
      icon: Award, title: "My Certificates",
      description: "Verified CPD certificates with public verification codes for your portfolio.",
      cta: "View Certificates", to: "/cpd/certificates", tone: "amber" as Tone
    },
    isVerifiedContributor
      ? {
        icon: PenTool, title: "CPD Authoring",
        description: "Create, edit, and publish CPD activities as a verified contributor.",
        cta: "Manage", to: "/cpd/admin/activities", tone: "violet" as Tone
      }
      : {
        icon: UserCheck, title: "Apply to Contribute",
        description: "Get verified as a contributor and earn MedraeCoins for your content.",
        cta: "Apply", to: "/cpd/apply", tone: "blue" as Tone
      },
  ];

  return (
    // ─── ONLY CHANGE: px-4 → px-1.5 sm:px-4 (tighter gutters on phone) ───
    <div className="w-full max-w-[880px] mx-auto px-1.5 sm:px-4 pt-3 pb-16 space-y-2.5">
      <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
              Welcome back, {profile?.name || (profileLoading ? "…" : "Nurse")}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
              Your professional nursing dashboard
            </p>
          </div>
          {isVerifiedContributor && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
                             text-[10px] font-bold bg-emerald-50 text-emerald-700
                             dark:bg-emerald-400/10 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
      </section>



      <div className="grid grid-cols-2 gap-2">
        <StatTile label="CPD Points" value={cpdLoading ? "…" : fmtPoints(cpdStats?.total_points)}
          icon={Award} tone="amber" to="/cpd" cta="Dashboard" />
        <StatTile label="CPD Hours" value={cpdLoading ? "…" : fmtHours(cpdStats?.total_hours)}
          hint={cpdLoading ? "…" : `${cpdStats?.completed_count ?? 0} completed`}
          icon={Clock} tone="blue" />
        <StatTile label="License" value={license ? "Active" : "Missing"}
          hint={daysUntilExpiry ? `${daysUntilExpiry}d to renewal` : license ? "Up to date" : "Upload license"}
          icon={ShieldCheck} tone={license ? "emerald" : "rose"} />
        <StatTile label="Notifications" value={notifications} hint="Unread alerts" icon={Bell} tone="violet" />
        <StatTile label="Upcoming Shifts" value={shiftCount} hint="Scheduled" icon={CalendarDays} tone="blue" />
        <StatTile label="Jobs" value={jobCount} hint="Verified openings" icon={Briefcase} tone="emerald" />
        <StatTile label="In Progress" value={cpdLoading ? "…" : cpdStats?.in_progress_count ?? 0}
          icon={TrendingUp} tone="violet" to="/cpd/progress" cta="Continue" />
        <StatTile label="Certificates" value={cpdLoading ? "…" : cpdStats?.certificates_count ?? 0}
          icon={GraduationCap} tone="amber" to="/cpd/certificates" cta="View" />
      </div>
      <ContributorEarningsCard />
      {cpdStats?.recent_completions?.length ? (
        <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent CPD Activity
            </h2>
            <Link to="/cpd/progress" onClick={() => tap()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 active:scale-[0.97] transition-transform"
              style={{ touchAction: "manipulation" }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {cpdStats.recent_completions.slice(0, 3).map((c) => (
              <div key={c.id}
                className="flex items-center justify-between gap-2.5 py-2.5 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.6} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                      {c.activity_title ?? "CPD Activity"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {new Date(c.completed_at).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0
                                 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400">
                  +{fmtPoints(c.points_awarded)} pts
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white dark:bg-[#161b22] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">Mentorship</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                Connect with experienced nurses or mentor new professionals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-[16px] font-bold text-slate-900 dark:text-white tabular-nums leading-tight">
                {mentorshipCount}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Users className="h-4 w-4" strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            CPD Tools
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold
                           bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {liveTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.title} to={tool.to} onClick={() => tap()}
                className="block rounded-2xl bg-white dark:bg-[#161b22] p-3 active:scale-[0.99] transition-transform h-full"
                style={{ touchAction: "manipulation" }}>
                <div className="space-y-2 flex flex-col h-full">
                  <div className={`h-9 w-9 rounded-xl ${ICON_BG[tool.tone]} flex items-center justify-center shrink-0`}>
                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">{tool.title}</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mt-0.5">
                      {tool.description}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider pt-1 mt-auto">
                    {tool.cta} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <DailyDose onOpenPlayer={() => window.__studifyOpen?.()} />
    </div>
  );
}