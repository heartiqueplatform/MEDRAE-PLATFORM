// src/pages/dashboard/staff.tsx
"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  CalendarDays, Bell, Briefcase, Users, ShieldCheck, BookOpen,
  GraduationCap, Award, Clock, TrendingUp, CheckCircle2, ArrowRight,
  PlayCircle, PenTool, Sparkles, UserCheck, Coins, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";

import { useDashboardStats } from "@/staff-cpd/hooks";
import { useMedraeCoinConfig } from "@/staff-cpd/lib/admin-hooks";
import { fmtHours, fmtPoints } from "@/staff-cpd/lib";
import { playSound } from "@/lib/soundManager";
import DailyDose from "@/components/DailyDose";
import {
  useWallet, useRecentTransactions, useStaffProfile,
} from "@/staff-cpd/lib/contributor-hooks";

/* ------------------------------------------------------------------ */
/*  Module-level cache — survives route changes / remounts            */
/*  so userId is non-null on the FIRST render after navigating back.  */
/* ------------------------------------------------------------------ */
let cachedUserId: string | null = null;
/* ------------------------------------------------------------------ */
/*  Contributor flag cache — read synchronously on first render       */
/*  so non-contributors NEVER see the skeleton after their first visit */
/* ------------------------------------------------------------------ */
const CONTRIB_FLAG_KEY = "medrae.isContributor";
let cachedIsContributor: boolean | null = (() => {
  try {
    const raw = localStorage.getItem(CONTRIB_FLAG_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
  } catch { /* ignore */ }
  return null;
})();

function writeContributorFlag(is: boolean) {
  cachedIsContributor = is;
  try { localStorage.setItem(CONTRIB_FLAG_KEY, is ? "1" : "0"); } catch { /* ignore */ }
}
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
   SkeletonEarningsCard
   Same footprint as the real card. Renders whenever we don't yet
   know if this user is a contributor, so there's never a jump.
   ═══════════════════════════════════════════════════════════════ */
const Sk = "rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse";

function SkeletonEarningsCard() {
  return (
    <section className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className={`h-10 w-10 rounded-xl shrink-0 ${Sk}`} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className={`h-3 w-40 ${Sk}`} />
          <div className={`h-2.5 w-52 ${Sk}`} />
        </div>
        <div className={`h-6 w-16 rounded-full shrink-0 ${Sk}`} />
      </div>

      {/* Balance block */}
      <div className="rounded-xl bg-white/80 dark:bg-[#0d1117]/70 p-3 space-y-2">
        <div>
          <div className={`h-2 w-24 ${Sk}`} />
          <div className={`mt-1 h-7 w-32 ${Sk}`} />
          <div className={`mt-1 h-3 w-20 ${Sk}`} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div>
            <div className={`h-2 w-16 ${Sk}`} />
            <div className={`mt-1 h-3 w-20 ${Sk}`} />
          </div>
          <div>
            <div className={`h-2 w-20 ${Sk}`} />
            <div className={`mt-1 h-3 w-16 ${Sk}`} />
          </div>
        </div>
      </div>

      {/* Transaction slot — fixed height matches real card */}
      <div className="space-y-1 min-h-[4.5rem]">
        <div className={`h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse`} />
        <div className={`h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse`} />
        <div className={`h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse`} />
      </div>

      {/* Two-button footer */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`h-9 rounded-xl bg-white/70 dark:bg-[#0d1117]/60 animate-pulse`} />
        <div className={`h-9 rounded-xl bg-amber-600/40 animate-pulse`} />
      </div>
    </section>
  );
}
/* ═══════════════════════════════════════════════════════════════
   Contributor Earnings Card
   — ALWAYS renders once userId exists.
   — Only digits/list show loading state.
   — Fixed-height transaction slot so nothing below ever moves.
   ═══════════════════════════════════════════════════════════════ */
function ContributorEarningsCard({
  userId, tier, loadingProfile,
}: {
  userId: string;
  tier: string;
  loadingProfile: boolean;
}) {
  const { data: wallet, isLoading: walletLoading } = useWallet(userId);
  const { data: transactions = [], isLoading: txLoading } = useRecentTransactions(userId, 3);

  const { data: coinConfig } = useMedraeCoinConfig();
  const coinToKes = coinConfig?.coin_to_kes_rate ?? 0.01;
  const minWithdrawal = coinConfig?.minimum_withdrawal ?? 1000;
  const coinsPerCompletion = coinConfig?.coins_per_completion ?? 20;

  const numbersLoading = walletLoading && txLoading && !wallet && transactions.length === 0;
  const txLoadingOnly = txLoading && transactions.length === 0;

  const balance = wallet?.balance ?? 0;
  const lifetimeEarned = wallet?.lifetime_earned ?? 0;
  const balanceKes = (balance * coinToKes).toFixed(2);
  const canWithdraw = balance >= minWithdrawal;

  const tierLabel = (tier || "contributor")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <section className="rounded-2xl bg-amber-50 dark:bg-amber-400/10 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
          <Coins className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-bold text-amber-800 dark:text-amber-300 leading-tight">
            Your MedraeCoins
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80 mt-0.5">
            {loadingProfile ? "Verified contributor" : `${tierLabel} · Verified contributor`}
          </p>
        </div>
        <Link to="/cpd/redeem" onClick={() => tap()}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 shrink-0
             bg-white/70 dark:bg-[#0d1117]/60 text-[10px] font-bold
             text-amber-700 dark:text-amber-300 active:scale-[0.97] transition-transform"
          style={{ touchAction: "manipulation" }}>
          Redeem <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="rounded-xl bg-white/80 dark:bg-[#0d1117]/70 p-3 space-y-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Wallet balance
          </p>
          <p className="h-8 text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5">
            {numbersLoading ? (
              <span className="inline-block h-6 w-24 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse align-middle" />
            ) : (
              <>{balance.toLocaleString()}
                <span className="text-sm ml-1 text-amber-600 dark:text-amber-400">MC</span></>
            )}
          </p>
          <p className="h-4 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {numbersLoading ? (
              <span className="inline-block h-3 w-20 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse" />
            ) : `≈ KSh ${balanceKes}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lifetime</p>
            <p className="h-4 text-[12px] font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
              {numbersLoading ? (
                <span className="inline-block h-3 w-16 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse" />
              ) : `${lifetimeEarned.toLocaleString()} MC`}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Withdrawable</p>
            <p className={`h-4 text-[12px] font-bold tabular-nums mt-0.5 ${canWithdraw ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
              }`}>
              {numbersLoading ? (
                <span className="inline-block h-3 w-12 rounded bg-slate-200/70 dark:bg-white/[0.08] animate-pulse" />
              ) : canWithdraw ? "Yes" : `Need ${(minWithdrawal - balance).toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1 min-h-[4.5rem]">
        {txLoadingOnly ? (
          <>
            <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
            <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
            <div className="h-7 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 animate-pulse" />
          </>
        ) : transactions.length > 0 ? (
          transactions.map((tx) => {
            const isEarn = tx.amount > 0;
            return (
              <div key={tx.id}
                className="flex items-center gap-2 rounded-lg bg-white/60 dark:bg-[#0d1117]/60 px-2 py-1.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${isEarn ? "bg-emerald-50 dark:bg-emerald-400/10" : "bg-rose-50 dark:bg-rose-400/10"}`}>
                  {isEarn ? (
                    <ArrowDownLeft className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ArrowUpRight className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                  )}
                </div>
                <p className="flex-1 text-[10px] font-bold text-slate-900 dark:text-white truncate">
                  {tx.reason || tx.kind.replace(/_/g, " ")}
                </p>
                <span className={`text-[10px] font-bold tabular-nums shrink-0 ${isEarn ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {isEarn ? "+" : ""}{tx.amount}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-snug text-center py-3">
            No earnings yet — publish an activity to start earning {coinsPerCompletion} MC per completion.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/cpd/admin/activities" onClick={() => tap()}
          className="h-9 rounded-xl bg-white/70 dark:bg-[#0d1117]/60 text-amber-700 dark:text-amber-300
               text-[11px] font-bold flex items-center justify-center gap-1.5
               active:scale-[0.97] transition-transform"
          style={{ touchAction: "manipulation" }}>
          <BookOpen className="h-3.5 w-3.5" /> Activities
        </Link>
        <Link to="/cpd/redeem" onClick={() => tap()}
          className="h-9 rounded-xl bg-amber-600 text-white text-[11px] font-bold
               flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
          style={{ touchAction: "manipulation" }}>
          <Coins className="h-3.5 w-3.5" /> Redeem
        </Link>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════ */
export default function StaffDashboard() {
  // INITIALIZE from the module cache → non-null on the FIRST render
  // of every remount after the first ever load.
  const [userId, setUserId] = useState<string | null>(cachedUserId);
  const [license, setLicense] = useState<any>(null);
  const [shiftCount, setShiftCount] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [mentorshipCount, setMentorshipCount] = useState(0);

  const { data: cpdStats, isLoading: cpdLoading } = useDashboardStats();
  const { data: profile, isLoading: profileLoading } = useStaffProfile(userId);
  const { data: cachedWallet } = useWallet(userId);

  /* Auth — updates module cache too */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const id = data.session?.user.id ?? null;
      cachedUserId = id;       // write-through
      setUserId(id);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Other dashboard data */
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
  const profileLoaded = !profileLoading && !!profile;

  // Once the profile has resolved, persist the verdict for next time.
  if (profileLoaded) {
    writeContributorFlag(profileSaysContributor || hasCachedWallet);
  }

  // What do we *know* right now?
  const knownContributor =
    profileSaysContributor ||
    hasCachedWallet ||
    cachedIsContributor === true;

  const knownNotContributor =
    !knownContributor &&
    (
      // Profile resolved as non-contributor and no wallet
      (profileLoaded && !profileSaysContributor && !hasCachedWallet) ||
      // OR we remembered from last visit that they aren't
      cachedIsContributor === false
    );

  // Render decision — three states, not two
  const showContributorCard = !!userId && knownContributor;
  const showSkeleton = !!userId && !knownContributor && !knownNotContributor;

  // `isVerifiedContributor` still gates the "Verified" badge and the
  // "CPD Authoring" vs "Apply to Contribute" tool card — keep it as-is
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
    <div className="w-full max-w-[880px] mx-auto px-4 pt-4 pb-16 space-y-3">
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

      {userId ? (
        showContributorCard ? (
          <ContributorEarningsCard
            userId={userId}
            tier={profile?.contributor_tier ?? "contributor"}
            loadingProfile={profileLoading}
          />
        ) : showSkeleton ? (
          <SkeletonEarningsCard />
        ) : null
      ) : (
        <SkeletonEarningsCard />
      )}
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