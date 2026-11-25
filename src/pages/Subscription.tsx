"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Check, CreditCard, Smartphone, Loader2, AlertCircle, HelpCircle, Info,
  ShieldCheck, FileText, Settings as SettingsIcon, ChevronDown,
  CheckCircle2, XCircle, Clock, Receipt, Copy, Crown, Lock, Zap, Minus,
  ChevronLeft,   // 👈 ADD THIS
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LegalTermsModal } from "@/components/subscription/LegalTermsModal";
import { SubscriptionInfoModal } from "@/components/subscription/SubscriptionInfoModal";
import { GroupPaySubscriptionCard } from "@/components/grouppay/GroupPaySubscriptionCard";
import { getCachedPremium, resolveSubscription } from "@/lib/subscription";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { LastMinuteCard } from "@/components/last-minute/LastMinuteCard";
import { FreeTierCard } from "@/components/subscription/FreeTierCard";
import { OneMonthTierCard } from "@/components/subscription/OneMonthTierCard";
import { TwoMonthTierCard } from "@/components/subscription/TwoMonthTierCard";
import { CenteredModal } from "@/components/ui/CenteredModal";
// ─────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────
const PRICES = {
  STUDENT: { ONE_MONTH: 249, TWO_MONTHS: 399 },
  TUTOR: { ONE_MONTH: 1249, TWO_MONTHS: 1999 },
  STAFF: { ONE_MONTH: 679, TWO_MONTHS: 999 },
};

type DurationKey = "1-month" | "2-months";

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────
function SubscriptionSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8 md:py-12 space-y-6 animate-pulse">
      <div className="space-y-3 text-center">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
        <div className="h-10 md:h-12 w-3/4 max-w-md bg-slate-200 dark:bg-slate-700 rounded-2xl mx-auto" />
        <div className="h-4 w-2/3 max-w-sm bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="h-96 bg-slate-200/80 dark:bg-slate-700/60 rounded-3xl" />
        <div className="h-96 bg-slate-200/80 dark:bg-slate-700/60 rounded-3xl" />
        <div className="h-96 bg-slate-200/80 dark:bg-slate-700/60 rounded-3xl" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Overlay
// ─────────────────────────────────────────────────────────────
const OverlayMessage = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) => {
  useEffect(() => {
    if (type === "error") {
      const t = setTimeout(onClose, 8000);
      return () => clearTimeout(t);
    }
  }, [onClose, type]);

  const ok = type === "success";

  return (
    <CenteredModal
      open
      onClose={onClose}
      hideHeader
      noScrollBody
      maxWidthClass="max-w-md"
      maxHeight="auto"
      bodyClassName="relative"
    >
      <div className="w-full overflow-hidden rounded-3xl">
        <div
          className={`h-1 w-full ${ok
            ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
            : "bg-gradient-to-r from-rose-400 to-rose-600"
            }`}
        />
        <div className="p-6 md:p-8 space-y-5 text-center">
          <div
            className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${ok
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-rose-500/10 text-rose-500"
              }`}
          >
            {ok ? (
              <Check className="h-7 w-7" strokeWidth={2.5} />
            ) : (
              <AlertCircle className="h-7 w-7" strokeWidth={2.5} />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">
              {ok ? "Check your phone" : "Payment could not start"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
          <Button
            onClick={onClose}
            className="w-full h-11 rounded-xl font-medium"
            variant={ok ? "default" : "secondary"}
          >
            {ok ? "Got it" : "Try again"}
          </Button>
          {ok && (
            <p className="text-[11px] text-muted-foreground">
              Keep this tab open. Activation is automatic.
            </p>
          )}
        </div>
      </div>
    </CenteredModal>
  );
};

// ─────────────────────────────────────────────────────────────
// Payment row (unchanged logic)
// ─────────────────────────────────────────────────────────────
function PaymentRow({ payment }: { payment: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = (payment.status || "pending").toLowerCase();
  const isSuccess = status === "completed" || status === "success";
  const isFailed =
    status === "failed" || status === "cancelled" || status === "rejected";

  const cfg = isSuccess
    ? { label: "Completed", icon: CheckCircle2, cls: "text-emerald-500", bg: "bg-emerald-500/10" }
    : isFailed
      ? {
        label:
          status === "cancelled" ? "Cancelled" : status === "rejected" ? "Rejected" : "Failed",
        icon: XCircle,
        cls: "text-rose-500",
        bg: "bg-rose-500/10",
      }
      : { label: "Pending", icon: Clock, cls: "text-amber-500", bg: "bg-amber-500/10" };

  const StatusIcon = cfg.icon;

  const fmt = (d: string | null) =>
    !d
      ? "—"
      : new Date(d).toLocaleString("en-KE", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const planLabel = payment.plan_type
    ? payment.plan_type.replace(/_premium$/i, "").replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase()) + " Premium"
    : "Premium";

  const durationLabel = (() => {
    const d = (payment.duration_type || "").toLowerCase();
    if (!d) return "—";
    if (d === "monthly") return "Monthly";
    if (["1-month", "1month", "1_month"].includes(d)) return "1 Month";
    if (["2-months", "2months", "2_months"].includes(d)) return "2 Months";
    return d.charAt(0).toUpperCase() + d.slice(1);
  })();

  const methodLabel = (() => {
    const m = (payment.method || "").toLowerCase();
    if (m === "mpesa" || m === "m-pesa") return "M-Pesa";
    return m ? m.charAt(0).toUpperCase() + m.slice(1) : "—";
  })();

  const roleLabel = payment.role_at_payment
    ? payment.role_at_payment.charAt(0).toUpperCase() + payment.role_at_payment.slice(1)
    : "—";

  const cur =
    (payment.currency || "KES").toUpperCase() === "KES" ? "KSh" : payment.currency;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`p-2 rounded-lg shrink-0 ${cfg.bg}`}>
          <StatusIcon className={`h-4 w-4 ${cfg.cls}`} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">
              {planLabel} · {durationLabel}
            </span>
            <span className={`text-[11px] font-medium ${cfg.cls}`}>{cfg.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{fmt(payment.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm md:text-base font-semibold tabular-nums">
            {cur} {Number(payment.amount).toLocaleString()}
          </span>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="d"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow
                  label="Transaction ID"
                  value={payment.transaction_id || "Not yet assigned"}
                  mono={!!payment.transaction_id}
                  copyable={!!payment.transaction_id}
                  onCopy={copy}
                  copied={copied}
                />
                <DetailRow label="Method" value={methodLabel} />
                <DetailRow label="Plan" value={planLabel} />
                <DetailRow label="Duration" value={durationLabel} />
                <DetailRow label="Role" value={roleLabel} />
                <DetailRow label="Currency" value={(payment.currency || "KES").toUpperCase()} />
                <DetailRow label="Initiated" value={fmt(payment.created_at)} />
                <DetailRow label={isSuccess ? "Completed" : "Paid at"} value={fmt(payment.paid_at)} />
                {payment.description && payment.description !== "System generated" && (
                  <DetailRow label="Description" value={payment.description} span />
                )}
                {payment.notes && (
                  <div className="sm:col-span-2 bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">
                      NOTES
                    </p>
                    <p className="text-xs leading-relaxed">{payment.notes}</p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground italic">
                {isSuccess && "Keep this record for your reference. All payments are final and non-refundable."}
                {isFailed && "This payment did not go through. No amount was charged."}
                {!isSuccess && !isFailed && "Waiting for confirmation — this usually takes under a minute."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailRow({
  label, value, mono, span, copyable, onCopy, copied,
}: {
  label: string; value: string; mono?: boolean; span?: boolean;
  copyable?: boolean; onCopy?: (t: string) => void; copied?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5 min-w-0">
        <p className={`text-xs md:text-sm break-all ${mono ? "font-mono" : "font-medium"}`}>
          {value}
        </p>
        {copyable && value !== "—" && onCopy && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy(value); }}
            className="p-1 rounded hover:bg-muted transition-colors shrink-0"
            title="Copy"
          >
            <Copy size={12} className={copied ? "text-emerald-500" : "text-muted-foreground"} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export function Subscription() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const home = useHomeRoute();   // 👈 1) NEW

  const contentRef = useRef<HTMLDivElement | null>(null);

  const handleBack = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    navigate(home, { replace: true });   // 👈 2) CHANGED — was "/dashboard"
  };
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [overlayMessage, setOverlayMessage] = useState<{
    text: string; type: "success" | "error";
  } | null>(null);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [showLegalTerms, setShowLegalTerms] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [isPremium, setIsPremium] = useState<boolean>(
    () => getCachedPremium(session?.user?.id) ?? false
  );
  // ✅ Auto-accept terms. Users who tap Pay are implicitly agreeing —
  //    the checkbox remains interactive if they want to un-tick it.
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(true);
  const [showTermsWarning, setShowTermsWarning] = useState(false);
  // ✅ Inline hint shown when the user taps Pay without a valid M-Pesa number.
  const [showPhoneHint, setShowPhoneHint] = useState(false);
  const [otherSubscriptions, setOtherSubscriptions] = useState<any[]>([]);
  const paymentChannelRef = useRef<any>(null);

  // ── Load profile + subs + payments ────────────────────────
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.id) {
        setFetchingProfile(false);
        return;
      }
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, phone")
          .eq("user_id", session.user.id)
          .single();

        if (profile) {
          setUserRole(profile.role?.toLowerCase());
          if (profile.phone) setPhoneNumber(profile.phone);
        }

        const currentRole = profile?.role || "student";
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .eq("role_at_payment", currentRole)
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setActiveSub(sub || null);

        const { data: payments } = await supabase
          .from("payments")
          .select(
            `id, amount, currency, plan_type, method, transaction_id, status,
             created_at, paid_at, duration_type, role_at_payment, description, notes`
          )
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (payments) setTransactions(payments);

        const cached = getCachedPremium(session.user.id);
        if (cached !== null) setIsPremium(cached);

        try {
          const snap = await resolveSubscription(session.user.id);
          setIsPremium(snap.isPremium);
        } catch { }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setFetchingProfile(false);
      }
    }
    loadProfile();
  }, [session, supabase]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && paymentChannelRef.current) {
        supabase.removeChannel(paymentChannelRef.current);
        paymentChannelRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (paymentChannelRef.current) supabase.removeChannel(paymentChannelRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchUpdates = async () => {
      if (document.hidden) return;
      try {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_type, is_active, expires_at")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (sub) setActiveSub(sub);

        const { data: payments } = await supabase
          .from("payments")
          .select(
            `id, amount, currency, plan_type, method, transaction_id, status,
             created_at, paid_at, duration_type, role_at_payment`
          )
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (payments) setTransactions(payments);

        try {
          const snap = await resolveSubscription(session.user.id);
          setIsPremium(snap.isPremium);
        } catch { }
      } catch { }
    };
    const i = setInterval(fetchUpdates, 60000);
    return () => clearInterval(i);
  }, [session, supabase]);

  useEffect(() => {
    const run = async () => {
      if (!session?.user?.id) return;
      if (activeSub) { setOtherSubscriptions([]); return; }
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("role_at_payment, expires_at")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .gte("expires_at", new Date().toISOString())
          .neq("role_at_payment", userRole || "student");
        setOtherSubscriptions(data || []);
      } catch {
        setOtherSubscriptions([]);
      }
    };
    run();
  }, [session, supabase, activeSub, userRole]);

  const startPaymentListener = () => {
    if (paymentChannelRef.current) supabase.removeChannel(paymentChannelRef.current);

    const channel = supabase
      .channel(`payment_check_${session?.user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `user_id=eq.${session?.user?.id}`,
        },
        (payload) => {
          const status = (payload.new as any).status;
          if (status === "completed") {
            setOverlayMessage({
              text: "Payment confirmed. Your plan is now active.",
              type: "success",
            });
            setLoading(false);
            supabase.removeChannel(channel);
            paymentChannelRef.current = null;
            if (session?.user?.id) {
              resolveSubscription(session.user.id, { force: true })
                .then((snap) => setIsPremium(snap.isPremium))
                .catch(() => { });
            }
            setTimeout(() => window.location.reload(), 3000);
          }
        }
      )
      .subscribe();

    paymentChannelRef.current = channel;

    setTimeout(() => {
      if (paymentChannelRef.current) {
        supabase.removeChannel(paymentChannelRef.current);
        paymentChannelRef.current = null;
      }
      setLoading(false);
    }, 120000);
  };

  const handleMpesapayment = async (
    planId: string,
    amount: number,
    durationType: DurationKey
  ) => {
    if (!hasAgreedToTerms) { setShowTermsWarning(true); return; }
    if (activeSub) {
      setOverlayMessage({ text: "You already have an active subscription.", type: "error" });
      return;
    }

    let clean = phoneNumber.replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "254" + clean.substring(1);
    else if (!clean.startsWith("254")) clean = "254" + clean;

    if (clean.length !== 12) {
      // ✅ Smart focus: scroll the phone input into view and focus it.
      //    Show an inline hint under the field instead of a blocking modal.
      setShowPhoneHint(true);

      // Defer to next frame so the hint is rendered before we scroll
      requestAnimationFrame(() => {
        const el = document.getElementById("phone") as HTMLInputElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Focus after scroll starts so mobile browsers don't fight us
          setTimeout(() => {
            try { el.focus({ preventScroll: true }); } catch { /* ignore */ }
          }, 300);
        }
      });

      // Auto-clear the hint after 5 seconds
      setTimeout(() => setShowPhoneHint(false), 5000);
      return;
    }

    // Clear the hint if it was showing
    setShowPhoneHint(false);

    setLoading(true);

    try {
      const currentRole = userRole || "student";
      const planType =
        currentRole === "tutor" ? "tutor_premium"
          : currentRole === "staff" ? "staff_premium"
            : "student_premium";

      const res = await fetch(
        "https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/stk",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            phone: clean, amount, planType,
            userId: session?.user?.id,
            roleAtPayment: currentRole,
            durationType,
          }),
        }
      );
      const data = await res.json();

      if (res.ok && (data.ResponseCode === "0" || data.CheckoutRequestID)) {
        const dl = durationType === "1-month" ? "1-month" : "2-month";
        setOverlayMessage({
          text: `Enter your M-Pesa PIN on ${clean} to confirm the ${dl} plan. This page updates automatically.`,
          type: "success",
        });
        startPaymentListener();
      } else {
        throw new Error(data.error || data.ResponseDescription || "STK request failed");
      }
    } catch (err: any) {
      setLoading(false);
      setOverlayMessage({ text: `Payment failed: ${err.message}`, type: "error" });
    }
  };

  const getDaysRemaining = (expiry: string) => {
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  };
  const getTotalPlanDays = (sub: any) =>
    sub?.duration_type === "1-month" ? 30 : 60;
  // ✅ Only show skeleton if we have NO cached data to paint
  // ✅ Only show skeleton if we have NO cached data to paint
  const hasCachedData = !!activeSub || transactions.length > 0;
  const showSkeleton = fetchingProfile && !hasCachedData;
  // ── Role → tier resolution ─────────────────────────────────
  type PaidRole = "student" | "tutor" | "staff";
  const resolvePaidRole = (role: string | null | undefined): PaidRole => {
    if (role === "staff") return "staff";
    if (role === "tutor" || role === "institution") return "tutor";
    return "student";
  };
  const paidRole = resolvePaidRole(userRole);

  const PRICE_TABLE: Record<PaidRole, { ONE_MONTH: number; TWO_MONTHS: number }> = {
    student: PRICES.STUDENT,
    tutor: PRICES.TUTOR,
    staff: PRICES.STAFF,
  };

  const oneMonthPrice = PRICE_TABLE[paidRole].ONE_MONTH;
  const twoMonthPrice = PRICE_TABLE[paidRole].TWO_MONTHS;
  const savings = oneMonthPrice * 2 - twoMonthPrice;
  const savingsPct = Math.max(0, Math.round((savings / (oneMonthPrice * 2)) * 100));

  const hasActivePlan = !!activeSub || isPremium;

  // ── Feature lists per tier ─────────────────────────────────
  const freeFeatures = [
    "Browse the full course library",
    "Access to free quizzes and notes",
    "Community learning and discussions",
    "Basic progress tracking",
  ];
  const freeNotIncluded = [
    "Premium exam bank",
    "Proctored practice environments",
    "Downloadable study guides",
  ];

  const oneMonthFeatures = [
    "Everything in Free",
    "Full premium exam bank",
    "Readiness Proctoriam & DigiProctor",
    "Downloadable study guides",
    "Personalized grade tracking",
  ];

  const twoMonthFeatures = [
    "Everything in 1 Month",
    "Priority support",
    "Early access to new features",
    "Best value per month",
  ];

  // ── Tier copy per role ─────────────────────────────────────
  const roleLabel =
    paidRole === "staff" ? "Staff" : paidRole === "tutor" ? "Tutor" : "Student";
  const tiers = [
    {
      key: "2-months" as DurationKey,
      name: "2 Months",
      priceLabel: `KSh ${twoMonthPrice.toLocaleString()}`,
      sub: "Billed once",
      blurb: `Full ${roleLabel} access for two months.`,
      features: twoMonthFeatures,
      excluded: [],
      ctaLabel: `Pay KSh ${twoMonthPrice.toLocaleString()}`,
      featured: true,
      accent: true,
      theme: "amber" as const,
      saveBadge: savings > 0 ? `Save KSh ${savings.toLocaleString()}` : null,
    },
    {
      key: "1-month" as DurationKey,
      name: "1 Month",
      priceLabel: `KSh ${oneMonthPrice.toLocaleString()}`,
      sub: "Billed once",
      blurb: `Full ${roleLabel} access for one month.`,
      features: oneMonthFeatures,
      excluded: [],
      ctaLabel: `Pay KSh ${oneMonthPrice.toLocaleString()}`,
      featured: false,
      accent: false,
      theme: "sky" as const,
    },
    {
      key: "free",
      name: "Free",
      priceLabel: "KSh 0",
      sub: "Always available",
      blurb: "Start learning. No card needed.",
      features: freeFeatures,
      excluded: freeNotIncluded,
      ctaLabel: "Continue free",
      featured: false,
      accent: false,
      theme: "neutral" as const,
    },
  ];
  const onSelectTier = (key: "free" | DurationKey) => {
    if (key === "free") return;
    handleMpesapayment(paidRole, PRICE_TABLE[paidRole][key === "1-month" ? "ONE_MONTH" : "TWO_MONTHS"], key);
  };
  const renderTierCard = (t: any, i: number) => {
    if (t.key === "free") {
      return <FreeTierCard key={t.key} tier={t} index={i} onOpenInfo={() => setShowInfoOverlay(true)} />;
    }
    if (t.key === "1-month") {
      return (
        <OneMonthTierCard
          key={t.key}
          tier={t}
          index={i}
          hasActivePlan={hasActivePlan}
          hasAgreedToTerms={hasAgreedToTerms}
          showTermsWarning={showTermsWarning}
          loading={loading}
          onSelect={() => onSelectTier(t.key as any)}
          onOpenInfo={() => setShowInfoOverlay(true)}
        />
      );
    }
    return (
      <TwoMonthTierCard
        key={t.key}
        tier={t}
        index={i}
        hasActivePlan={hasActivePlan}
        hasAgreedToTerms={hasAgreedToTerms}
        showTermsWarning={showTermsWarning}
        loading={loading}
        onSelect={() => onSelectTier(t.key as any)}
        onOpenInfo={() => setShowInfoOverlay(true)}
      />
    );
  };
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background overflow-hidden">
      {/* Sticky top bar with back arrow — full-screen chrome */}
      <header className="flex-shrink-0 w-full flex items-center gap-3 px-3 sm:px-6 py-2.5 sm:py-3
        border-b border-gray-100 dark:border-gray-800
        bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80
        z-30 safe-top">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center h-10 w-10 rounded-full
            bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
            active:scale-95 transition-all touch-manipulation"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white truncate">
          Subscription
        </h1>
      </header>

      {/* Internally-scrolling content — no visible browser scrollbar */}
      <div
        ref={contentRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden
          no-scrollbar"
      >
        {showSkeleton ? (
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-6 md:py-10 pb-24 safe-bottom">
            <SubscriptionSkeleton />
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-6 md:py-10 space-y-8 pb-24 safe-bottom">
            {overlayMessage && (
              <OverlayMessage
                message={overlayMessage.text}
                type={overlayMessage.type}
                onClose={() => setOverlayMessage(null)}
              />
            )}
            {showInfoOverlay && (
              <SubscriptionInfoModal
                onClose={() => setShowInfoOverlay(false)}
                durationMonths={2}
                tutorPrice={PRICES.TUTOR.TWO_MONTHS}
                studentPrice={PRICES.STUDENT.TWO_MONTHS}
                staffPrice={PRICES.STAFF.TWO_MONTHS}
              />
            )}
            {showLegalTerms && (
              <LegalTermsModal
                onClose={() => setShowLegalTerms(false)}
                onAgree={() => {
                  setHasAgreedToTerms(true);
                  setShowLegalTerms(false);
                }}
              />
            )}

            {/* Page header */}
            <section className="pt-2 md:pt-6 max-w-2xl">
              <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
                {hasActivePlan ? "Your plan" : "Choose your role plan"}
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                {hasActivePlan
                  ? "Manage your subscription and view your payment history."
                  : `You are signed in as ${roleLabel}. Pick a tier, cancel anytime by not renewing.`}
              </p>
            </section>

            {/* ─── Active sub summary ─────────────────────────── */}
            {hasActivePlan && activeSub && (
              <Card className="rounded-3xl overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent">
                <CardContent className="p-5 md:p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <Crown className="h-6 w-6 text-primary" strokeWidth={2.2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold capitalize">
                            {activeSub.plan_type.replace("_", " ")}
                          </h3>
                          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                            ACTIVE
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Started {new Date(activeSub.started_at).toLocaleDateString()}
                          {activeSub.role_at_payment && (
                            <> · <span className="capitalize">{activeSub.role_at_payment}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="text-3xl font-semibold tracking-tight tabular-nums">
                        {getDaysRemaining(activeSub.expires_at)}
                        <span className="text-base font-medium text-muted-foreground ml-1.5">
                          days left
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000"
                      style={{
                        width: `${Math.min(
                          100,
                          (getDaysRemaining(activeSub.expires_at) / getTotalPlanDays(activeSub)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {hasActivePlan && !activeSub && (
              <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-5 md:p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Crown className="h-6 w-6 text-emerald-500" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold">Premium active</h3>
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                        OFFLINE
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Showing your last known premium status.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Role mismatch nudge ─────────────────────────── */}
            {!activeSub && otherSubscriptions.length > 0 && (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 md:p-5 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Active plan on another role</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your subscription covers{" "}
                    <strong className="capitalize">{otherSubscriptions[0]?.role_at_payment}</strong>.
                    Switch roles in Settings to use it.
                  </p>
                  <Button size="sm" className="mt-3 rounded-lg" onClick={() => navigate("/settings")}>
                    <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
                    Open Settings
                  </Button>
                </div>
              </div>
            )}

            {activeSub && activeSub.role_at_payment && activeSub.role_at_payment !== userRole && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 md:p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Role and plan mismatch</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Plan covers{" "}
                    <strong className="capitalize">{activeSub.role_at_payment}</strong>, signed in as{" "}
                    <strong className="capitalize">{userRole}</strong>.
                  </p>
                  <Button size="sm" className="mt-3 rounded-lg" onClick={() => navigate("/settings")}>
                    <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
                    Fix in Settings
                  </Button>
                </div>
              </div>
            )}


            {/* ─── TIER CARDS ──────────────────────────────────── */}
            <section>
              {/* Mobile: horizontal snap-scroll. Desktop: 3-col grid. */}
              <div className="md:hidden -mx-4 px-4">
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
                  {tiers.map((t, i) => (
                    <div
                      key={t.key}
                      className="snap-center shrink-0 w-[85vw] max-w-sm"
                    >
                      {renderTierCard(t, i)}
                    </div>
                  ))}
                </div>
                {/* Dots indicator */}
                <div className="flex justify-center gap-1.5 pt-1">
                  {tiers.map((t) => (
                    <span
                      key={t.key}
                      className={`h-1.5 rounded-full transition-all ${t.featured ? "w-6 bg-primary" : "w-1.5 bg-border"
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid md:grid-cols-3 gap-5 items-stretch">
                {tiers.map((t, i) => renderTierCard(t, i))}
              </div>

              {/* Shared checkout strip */}
              {!hasActivePlan && (
                <div className="mt-6 rounded-2xl bg-muted/30 p-5 md:p-6 space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-foreground">
                      Ready to pay
                    </h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      Enter the M-Pesa number you want to pay with. Then tap the price button on whichever plan you want above. We will send an STK push to that number and you confirm it on your phone with your M-Pesa PIN.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                      M-Pesa number
                    </Label>

                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#00A651] flex items-center justify-center pointer-events-none">
                        <Smartphone className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        placeholder="0712 345 678"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (showPhoneHint) setShowPhoneHint(false);
                        }}
                        className={`pl-12 pr-3 h-14 rounded-xl bg-background text-lg font-semibold tracking-wide tabular-nums
                      border-2 transition-colors
                      ${showPhoneHint
                            ? "border-rose-400 focus-visible:ring-2 focus-visible:ring-rose-400/30"
                            : "border-border focus-visible:ring-2 focus-visible:ring-[#00A651]/40 focus-visible:border-[#00A651]"
                          }`}
                        aria-invalid={showPhoneHint}
                        aria-describedby="mpesa-help"
                      />
                    </div>

                    <p id="mpesa-help" className="text-[12px] text-muted-foreground leading-relaxed">
                      Use the number registered on your M-Pesa. The STK push goes to this number and only this number.
                    </p>

                    <AnimatePresence>
                      {showPhoneHint && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="text-[12px] font-medium text-rose-500 flex items-center gap-1.5 pt-1"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          Enter a valid M-Pesa number, for example 0712 345 678.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="rounded-xl bg-background p-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      About the M-Pesa fee
                    </p>
                    <p className="text-[13px] text-foreground leading-relaxed">
                      The price on the plan card is the full amount you pay Medrae. Safaricom separately applies its own M-Pesa transaction fee on top of that, and the exact fee depends on your M-Pesa tariff. Safaricom shows you the fee on your phone before you enter your PIN. Medrae does not receive any part of that fee.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Terms</p>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasAgreedToTerms}
                        onChange={(e) => {
                          setHasAgreedToTerms(e.target.checked);
                          if (e.target.checked) setShowTermsWarning(false);
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-border accent-primary shrink-0"
                      />
                      <span className="text-[13px] leading-relaxed text-muted-foreground">
                        I accept the{" "}
                        <button
                          type="button"
                          onClick={() => setShowLegalTerms(true)}
                          className="font-semibold text-primary underline underline-offset-2"
                        >
                          Terms
                        </button>{" "}
                        including the no refund policy.
                      </span>
                    </label>
                    {showTermsWarning && !hasAgreedToTerms && (
                      <p className="text-xs font-medium text-rose-500">
                        Accept the terms to continue.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#00A651]" />
                        Secured by Safaricom
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        Instant activation
                      </span>
                    </div>
                    <button
                      onClick={() => setShowLegalTerms(true)}
                      className="text-primary hover:underline flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Full terms
                    </button>
                  </div>
                </div>
              )}
            </section>
            {!activeSub && !hasActivePlan && paidRole === "student" && <GroupPaySubscriptionCard />}
            {/* ─── Payment history ──────────────────────────────── */}
            <section>
              <Card className="rounded-3xl border-0">
                <CardHeader className="px-6 pt-6 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        Payment history
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {transactions.length === 0
                          ? "Your transactions will appear here"
                          : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-6">
                  {transactions.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto">
                        <Receipt className="h-5 w-5 text-muted-foreground/60" />
                      </div>
                      <p className="text-sm text-muted-foreground">No payments yet</p>
                      <p className="text-xs text-muted-foreground/70">
                        Complete a payment to see it here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((p) => (
                        <PaymentRow key={p.id} payment={p} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        )}           {/* /showSkeleton ternary */}
      </div>         {/* /contentRef scroller */}
    </div>
  );
}

