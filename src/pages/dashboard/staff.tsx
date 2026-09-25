"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarDays,
  Bell,
  Briefcase,
  Users,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Award,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  PlayCircle,
  PenTool,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useDashboardStats } from "@/staff-cpd/hooks";
import { fmtHours, fmtPoints } from "@/staff-cpd/lib";

// ═══════════════════════════════════════════════════════════════
// Shared tone maps — matches the MedraeQuizzes / CPD admin theme
// ═══════════════════════════════════════════════════════════════
const GRADIENT_TONES: Record<string, string> = {
  emerald: "from-emerald-500 to-teal-600",
  blue: "from-blue-500 to-indigo-600",
  amber: "from-amber-500 to-orange-600",
  violet: "from-violet-500 to-purple-600",
  rose: "from-rose-500 to-pink-600",
  slate: "from-slate-500 to-slate-700",
};

const STAT_TONES = {
  amber: GRADIENT_TONES.amber,
  blue: GRADIENT_TONES.blue,
  green: GRADIENT_TONES.emerald,
  violet: GRADIENT_TONES.violet,
  rose: GRADIENT_TONES.rose,
  slate: GRADIENT_TONES.slate,
} as const;

// ═══════════════════════════════════════════════════════════════
// StatTile — compact, 2-per-row friendly
// ═══════════════════════════════════════════════════════════════
function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
  to,
  cta,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ComponentType<any>;
  tone?: keyof typeof STAT_TONES;
  to?: string;
  cta?: string;
}) {
  return (
    <Card className="relative overflow-hidden rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl transition-all duration-300 p-0 h-full">
      <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col gap-2 sm:gap-3 h-full">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${STAT_TONES[tone]} flex items-center justify-center flex-shrink-0 shadow-md`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" strokeWidth={2.4} />
          </div>
          <p className="text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right leading-tight">
            {label}
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
            {value}
          </p>
          {hint && (
            <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 leading-tight">
              {hint}
            </p>
          )}
        </div>

        {to && cta && (
          <Link
            to={to}
            className="mt-auto inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all pt-1"
          >
            {cta} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default function StaffDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [shiftCount, setShiftCount] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [mentorshipCount, setMentorshipCount] = useState(0);

  const { data: cpdStats, isLoading: cpdLoading } = useDashboardStats();

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .single();
      setProfile(profileData);

      const { data: licenseData } = await supabase
        .from("staff_licenses")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();
      setLicense(licenseData);

      const { data: shifts } = await supabase
        .from("staff_shifts")
        .select("id")
        .eq("user_id", user.id)
        .gte("start_time", new Date().toISOString());
      setShiftCount(shifts?.length || 0);

      const { data: notif } = await supabase
        .from("staff_notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_read", false);
      setNotifications(notif?.length || 0);

      const { data: jobs } = await supabase
        .from("staff_jobs")
        .select("id")
        .eq("verified", true)
        .eq("is_active", true);
      setJobCount(jobs?.length || 0);

      const { data: mentorship } = await supabase
        .from("staff_mentorship_requests")
        .select("id")
        .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
        .eq("status", "active");
      setMentorshipCount(mentorship?.length || 0);
    };

    loadDashboard();
  }, []);

  const daysUntilExpiry = license
    ? Math.ceil(
      (new Date(license.expiry_date).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    )
    : null;

  const liveTools = [
    {
      icon: BookOpen,
      title: "CPD Catalog",
      description: "Browse published CPD activities — videos, podcasts, articles, assessments.",
      cta: "Browse",
      to: "/cpd/catalog",
      tone: "emerald" as const,
    },
    {
      icon: PlayCircle,
      title: "My CPD Progress",
      description: "Resume learning, see completion percentages, and track in-progress activities.",
      cta: "Continue",
      to: "/cpd/progress",
      tone: "blue" as const,
    },
    {
      icon: Award,
      title: "My Certificates",
      description: "Verified CPD certificates with public verification codes for your portfolio.",
      cta: "View Certificates",
      to: "/cpd/certificates",
      tone: "amber" as const,
    },
    {
      icon: PenTool,
      title: "CPD Authoring",
      description: "Create, edit, and publish CPD activities as staff.",
      cta: "Manage",
      to: "/cpd/admin/activities",
      tone: "violet" as const,
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center">
      <div className="w-full md:max-w-full md:px-4 lg:px-6 space-y-4 md:space-y-6 px-4 sm:px-6 pt-4 sm:pt-8 pb-8">

        {/* ═══════════ WELCOME HERO ═══════════ */}
        <Card className="relative overflow-hidden md:shadow-xl md:shadow-blue-500/5 transition-all rounded-xl border-0 bg-transparent dark:bg-transparent">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-48 md:w-64 h-48 md:h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-5 sm:p-6 md:p-8 text-white shadow-lg shadow-indigo-500/20">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-lg flex-shrink-0 ring-1 ring-white/20">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-3xl font-bold tracking-tight leading-tight">
                  Welcome back, {profile?.name || "Nurse"} 👩‍⚕️
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-white/85 mt-1 leading-relaxed">
                  Your professional nursing dashboard
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════ STATS GRID — 2 PER ROW ON PHONE ═══════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[8px] sm:gap-3 md:gap-4">
          <StatTile
            label="CPD Points"
            value={cpdLoading ? "…" : fmtPoints(cpdStats?.total_points)}
            icon={Award}
            tone="amber"
            to="/cpd"
            cta="View dashboard"
          />
          <StatTile
            label="CPD Hours"
            value={cpdLoading ? "…" : fmtHours(cpdStats?.total_hours)}
            hint={cpdLoading ? "…" : `${cpdStats?.completed_count ?? 0} completed`}
            icon={Clock}
            tone="blue"
          />
          <StatTile
            label="License"
            value={license ? "Active" : "Missing"}
            hint={
              daysUntilExpiry
                ? `${daysUntilExpiry} days to renewal`
                : license
                  ? "Up to date"
                  : "Upload license"
            }
            icon={ShieldCheck}
            tone={license ? "green" : "rose"}
          />
          <StatTile
            label="Notifications"
            value={notifications}
            hint="Unread alerts"
            icon={Bell}
            tone="violet"
          />
          <StatTile
            label="Upcoming Shifts"
            value={shiftCount}
            hint="Scheduled"
            icon={CalendarDays}
            tone="blue"
          />
          <StatTile
            label="Jobs"
            value={jobCount}
            hint="Verified openings"
            icon={Briefcase}
            tone="emerald"
          />
          <StatTile
            label="In Progress"
            value={cpdLoading ? "…" : cpdStats?.in_progress_count ?? 0}
            icon={TrendingUp}
            tone="violet"
            to="/cpd/progress"
            cta="Continue learning"
          />
          <StatTile
            label="Certificates"
            value={cpdLoading ? "…" : cpdStats?.certificates_count ?? 0}
            icon={GraduationCap}
            tone="amber"
            to="/cpd/certificates"
            cta="View certificates"
          />
        </div>

        {/* ═══════════ RECENT CPD ACTIVITY ═══════════ */}
        {cpdStats?.recent_completions?.length ? (
          <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70">
            <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                Recent CPD Activity
              </CardTitle>
              <Link
                to="/cpd/progress"
                className="inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-4 md:pb-6 space-y-1">
              {cpdStats.recent_completions.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.6} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                        {c.activity_title ?? "CPD Activity"}
                      </p>
                      <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                        {new Date(c.completed_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                    +{fmtPoints(c.points_awarded)} pts
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* ═══════════ MENTORSHIP ═══════════ */}
        <Card className="border-0 shadow-sm rounded-xl bg-white dark:bg-muted/70 overflow-hidden p-0">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardContent className="p-4 md:p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-white" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <p className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  Mentorship
                </p>
                <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  Connect with experienced nurses or mentor new professionals
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Active
                </p>
                <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {mentorshipCount}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Users className="w-5 h-5 text-white" strokeWidth={2.4} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════ CPD TOOLS ═══════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3 md:mb-4 px-[4px] md:px-0">
            <h2 className="text-base md:text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              CPD Tools
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[8px] sm:gap-3 md:gap-4">
            {liveTools.map((tool) => {
              const Icon = tool.icon;
              const gradient = GRADIENT_TONES[tool.tone];
              return (
                <Link key={tool.title} to={tool.to} className="group">
                  <Card className="group relative overflow-hidden transition-all duration-300 rounded-xl border-0 bg-white dark:bg-muted/70 shadow-sm hover:shadow-xl p-0 h-full">
                    {/* Top accent bar */}
                    <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

                    <CardContent className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3 flex flex-col h-full">
                      <div
                        className={`h-10 w-10 md:h-11 md:w-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform flex-shrink-0`}
                      >
                        <Icon className="h-5 w-5 text-white" strokeWidth={2.4} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                          {tool.title}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mt-1">
                          {tool.description}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] md:text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all pt-1 mt-auto">
                        {tool.cta}
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}