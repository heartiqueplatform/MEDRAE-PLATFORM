"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, Smartphone, Users, Crown, Loader2, AlertCircle, X, HelpCircle, Info, Shield, FileText, Gavel, Briefcase, ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { LegalTermsModal } from "@/components/subscription/LegalTermsModal";
import { SubscriptionInfoModal } from "@/components/subscription/SubscriptionInfoModal";
import { toast } from "sonner"; // Add this import
import { GroupPaySubscriptionCard } from "@/components/grouppay/GroupPaySubscriptionCard";

const PRICES = {
  STUDENT: {
    TWO_MONTHS: 199,
  },
  TUTOR: {
    TWO_MONTHS: 299,
  },
  STAFF: {
    TWO_MONTHS: 299,
  },
  DURATION: {
    TWO_MONTHS: 2,
  }
};

function SubscriptionSkeleton() {
  return (
    <div className="md:max-w-full md:px-4 lg:px-6 mx-auto p-0 md:p-4 lg:p-8 space-y-0 md:space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="text-center space-y-1.5 md:space-y-2 px-4 md:px-0 pt-6 md:pt-0 pb-4 md:pb-0 border-0">
        <div className="inline-flex items-center justify-center p-1.5 md:p-2 bg-primary/10 rounded-full mb-1.5 md:mb-2">
          <div className="h-4 w-4 md:h-5 md:w-5 bg-gray-300 dark:bg-gray-700 rounded" />
          <div className="h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded ml-1.5 md:ml-2" />
        </div>
        <div className="h-8 md:h-12 w-64 md:w-96 bg-gray-300 dark:bg-gray-700 rounded mx-auto" />
        <div className="h-4 md:h-6 w-48 md:w-72 bg-gray-300 dark:bg-gray-700 rounded mx-auto mt-1 md:mt-2" />
      </div>

      {/* Active Subscription Status Skeleton */}
      <div className="bg-gray-200 dark:bg-gray-800 rounded-none md:rounded-xl border-0">
        <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <div className="bg-gray-300 dark:bg-gray-700 p-2 md:p-3 rounded-full h-9 w-9 md:h-12 md:w-12" />
            <div className="flex-1 md:flex-none">
              <div className="h-5 md:h-6 w-40 md:w-56 bg-gray-300 dark:bg-gray-700 rounded" />
              <div className="h-3 md:h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mt-1" />
            </div>
          </div>
          <div className="text-center md:text-right w-full md:w-auto">
            <div className="h-7 md:h-9 w-20 md:w-28 bg-gray-300 dark:bg-gray-700 rounded mx-auto md:mx-0" />
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-700 rounded mx-auto md:mx-0 mt-1" />
          </div>
        </div>
        <div className="bg-gray-300 dark:bg-gray-700 h-1 w-full">
          <div className="bg-gray-400 dark:bg-gray-600 h-full w-3/4" />
        </div>
      </div>

      <div className="flex flex-col space-y-0 md:space-y-2">
        {/* Main Pricing Card Skeleton */}
        <div className="md:border-0 md:shadow-2xl overflow-hidden md:rounded-xl dark:md:bg-muted/30 rounded-none border-0 shadow-none">
          <div className="bg-primary/5 p-4 md:p-6 lg:p-8 border-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
              <div>
                <div className="h-6 md:h-7 w-48 md:w-64 bg-gray-300 dark:bg-gray-700 rounded" />
                <div className="h-3 md:h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mt-0.5 md:mt-1" />
              </div>
              <div className="h-8 md:h-10 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-8">
            <div className="flex flex-col space-y-3 md:space-y-4">
              <div className="space-y-3 md:space-y-4">
                <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
                <ul className="space-y-2 md:space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <li key={i} className="flex items-center gap-2 md:gap-3">
                      <div className="bg-gray-300 dark:bg-gray-700 p-1 rounded-full h-4 w-4 md:h-5 md:w-5" />
                      <div className="h-3 md:h-4 w-48 md:w-64 bg-gray-300 dark:bg-gray-700 rounded" />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Terms Agreement Skeleton */}
              <div className="bg-yellow-50 dark:bg-muted/50 p-3 md:p-4 rounded-lg md:rounded-xl border-0">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="h-5 w-5 md:h-6 md:w-6 bg-gray-300 dark:bg-gray-700 rounded mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 md:h-4 w-48 md:w-64 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-2 md:h-3 w-40 md:w-56 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>

              {/* Payment Box Skeleton */}
              <div className="bg-muted/50 dark:bg-gray-800/50 p-4 md:p-6 rounded-xl md:rounded-2xl border-0 space-y-3 md:space-y-4">
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-3 md:h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-3 md:h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="relative">
                    <div className="h-11 md:h-12 w-full bg-gray-300 dark:bg-gray-700 rounded-lg md:rounded-xl" />
                  </div>
                  <div className="h-2 md:h-3 w-48 bg-gray-300 dark:bg-gray-700 rounded" />
                </div>

                <div className="h-12 md:h-14 w-full bg-gray-300 dark:bg-gray-700 rounded-lg md:rounded-xl" />

                <div className="h-3 md:h-4 w-48 bg-gray-300 dark:bg-gray-700 rounded mx-auto" />
                <div className="h-2 md:h-3 w-56 bg-gray-300 dark:bg-gray-700 rounded mx-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History Skeleton */}
        <div className="md:border-none md:bg-muted/30 dark:md:bg-gray-800/30 md:shadow-none md:rounded-2xl rounded-none border-0 shadow-none">
          <div className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-3">
            <div className="h-4 md:h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-3 md:h-4 w-40 bg-gray-300 dark:bg-gray-700 rounded mt-1" />
          </div>
          <div className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="space-y-2 md:space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 md:p-4 bg-card dark:bg-gray-800 rounded-lg md:rounded-xl border-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3">
                  <div className="space-y-0.5 md:space-y-1 w-full sm:w-auto">
                    <div className="h-2 md:h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-3 md:h-4 w-16 bg-gray-300 dark:bg-gray-700 rounded" />
                    <div className="h-2 md:h-3 w-20 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-5 md:h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secure Information Skeleton */}
        <div className="p-4 md:p-6 md:bg-primary/5 dark:md:bg-primary/10 md:rounded-2xl border-0">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="bg-primary/10 dark:bg-primary/20 p-1.5 md:p-2 rounded-lg h-fit w-fit">
              <div className="h-4 w-4 md:h-5 md:w-5 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
            <div className="space-y-0.5 md:space-y-1 flex-1">
              <div className="h-4 md:h-5 w-48 md:w-64 bg-gray-300 dark:bg-gray-700 rounded" />
              <div className="h-3 md:h-4 w-64 md:w-96 bg-gray-300 dark:bg-gray-700 rounded" />
              <div className="h-3 md:h-4 w-48 md:w-64 bg-gray-300 dark:bg-gray-700 rounded mt-0.5 md:mt-1" />
            </div>
            <div className="h-3 md:h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded mt-2 sm:mt-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Overlay Modal Component
const OverlayMessage = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    if (type === 'error') {
      const timer = setTimeout(onClose, 8000);
      return () => clearTimeout(timer);
    }
  }, [onClose, type]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`relative overflow-hidden rounded-[2rem] shadow-2xl p-6 md:p-10 max-w-lg w-full mx-auto border-0 transform animate-in zoom-in-95 duration-300 ${type === 'success'
        ? 'bg-white dark:bg-slate-900 shadow-emerald-500/20'
        : 'bg-white dark:bg-slate-900 shadow-rose-500/20'
        }`}>

        {/* Background Decorative Gradient */}
        <div className={`absolute top-0 left-0 w-full h-2 ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

        <div className="flex flex-col items-center text-center space-y-6">
          <div className={`p-4 rounded-full ${type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
            {type === 'success' ? (
              <Check className="h-10 w-10 md:h-12 md:w-12 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            ) : (
              <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-rose-600 dark:text-rose-400 animate-pulse" />
            )}
          </div>

          <div className="space-y-3">
            <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {type === 'success' ? "Fantastic!" : "Wait a moment!"}
            </h3>
            <p className="text-base md:text-lg leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
              {message}
            </p>
          </div>

          <Button
            onClick={onClose}
            className={`w-full py-6 rounded-2xl text-lg font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] border-0 ${type === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
          >
            {type === 'success' ? "Great, let's go!" : "Try again"}
          </Button>

          {type === 'success' && !message.includes('Successful') && (
            <p className="text-xs text-slate-400 italic">
              Please don't close this window until you see the confirmation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Confetti Component
const Confetti = () => {
  useEffect(() => {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff1493', '#ffffff', '#00ffcc'];
    const confettiCount = 150;
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '1000';
    document.body.appendChild(container);

    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < confettiCount; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = Math.random() * 10 + 5 + 'px';
      particle.style.height = Math.random() * 10 + 5 + 'px';
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = Math.random() * window.innerWidth + 'px';
      particle.style.top = '-20px';
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%';
      particle.style.opacity = Math.random() * 0.7 + 0.3;
      particle.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(particle);
      particles.push(particle);

      const animation = particle.animate([
        { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
        { transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], {
        duration: Math.random() * 2000 + 2000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      animation.onfinish = () => {
        particle.remove();
      };
    }

    const partyPopperEffect = () => {
      for (let i = 0; i < 20; i++) {
        const strip = document.createElement('div');
        strip.style.position = 'absolute';
        strip.style.width = '4px';
        strip.style.height = Math.random() * 30 + 20 + 'px';
        strip.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        strip.style.left = window.innerWidth / 2 + (Math.random() - 0.5) * 200 + 'px';
        strip.style.bottom = '0';
        strip.style.borderRadius = '2px';
        container.appendChild(strip);

        strip.animate([
          { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
          { transform: `translateY(-${window.innerHeight}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
          duration: Math.random() * 1500 + 1000,
          easing: 'ease-out'
        }).onfinish = () => strip.remove();
      }
    };

    partyPopperEffect();

    setTimeout(() => {
      container.remove();
    }, 3000);
  }, []);

  return null;
};
export function Subscription() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  // ✅ ALL useState hooks at the top
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [overlayMessage, setOverlayMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [showLegalTerms, setShowLegalTerms] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [showTermsWarning, setShowTermsWarning] = useState(false);
  const [otherSubscriptions, setOtherSubscriptions] = useState<any[]>([]);
  const [checkingOthers, setCheckingOthers] = useState(false);
  const paymentChannelRef = useRef<any>(null);

  // ✅ ALL useEffect hooks at the top
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.id) {
        setFetchingProfile(false);
        return;
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, phone")
          .eq("user_id", session.user.id)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          setUserRole(profile.role?.toLowerCase());
          if (profile.phone) setPhoneNumber(profile.phone);
        }

        const currentRole = profile?.role || 'student';
        const { data: sub, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .eq("role_at_payment", currentRole)
          .gte("expires_at", new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) throw subError;

        if (sub) {
          setActiveSub(sub);
        } else {
          setActiveSub(null);
        }

        const { data: payments, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (paymentsError) throw paymentsError;

        if (payments) {
          setTransactions(payments);
        }

      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setFetchingProfile(false);
      }
    }

    loadProfile();
  }, [session, supabase]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && paymentChannelRef.current) {
        console.log("Tab hidden: Killing payment listener to save egress.");
        supabase.removeChannel(paymentChannelRef.current);
        paymentChannelRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (paymentChannelRef.current) {
        supabase.removeChannel(paymentChannelRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
          .select("transaction_id, amount, created_at, status")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (payments) setTransactions(payments);
      } catch (err) { }
    };

    const interval = setInterval(fetchUpdates, 60000);
    return () => clearInterval(interval);
  }, [session, supabase]);

  // ✅ Check for other subscriptions
  useEffect(() => {
    const checkOthers = async () => {
      if (!session?.user?.id) return;
      if (activeSub) {
        setOtherSubscriptions([]);
        return;
      }

      setCheckingOthers(true);
      try {
        const { data: subscriptions, error } = await supabase
          .from("subscriptions")
          .select("role_at_payment, expires_at")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .gte("expires_at", new Date().toISOString())
          .neq("role_at_payment", userRole || 'student');

        if (error) throw error;
        setOtherSubscriptions(subscriptions || []);
      } catch (error) {
        console.error("Error checking other subscriptions:", error);
        setOtherSubscriptions([]);
      } finally {
        setCheckingOthers(false);
      }
    };

    checkOthers();
  }, [session, supabase, activeSub, userRole]);

  // ✅ OPTIMIZED PAYMENT LISTENER
  const startPaymentListener = () => {
    console.log("Listening for payment success...");

    if (paymentChannelRef.current) {
      supabase.removeChannel(paymentChannelRef.current);
    }

    const channel = supabase
      .channel(`payment_check_${session?.user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `user_id=eq.${session?.user?.id}`
        },
        (payload) => {
          const status = (payload.new as any).status;
          if (status === "completed") {
            setOverlayMessage({
              text: "WELCOME TO PREMIUM! 🎉 Your payment was confirmed.",
              type: 'success'
            });
            setShowConfetti(true);
            setLoading(false);

            supabase.removeChannel(channel);
            paymentChannelRef.current = null;

            setTimeout(() => window.location.reload(), 5000);
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

  const handleMpesapayment = async (planId: string, amount: number) => {
    if (!hasAgreedToTerms) {
      setShowTermsWarning(true);
      return;
    }

    if (activeSub) {
      setOverlayMessage({ text: "You already have an active subscription!", type: 'error' });
      return;
    }

    let cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "254" + cleanPhone.substring(1);
    else if (!cleanPhone.startsWith("254")) cleanPhone = "254" + cleanPhone;

    if (cleanPhone.length !== 12) {
      setOverlayMessage({ text: "Please enter a valid M-Pesa number (e.g. 0712345678)", type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const currentRole = userRole || 'student';
      const planType = currentRole === "tutor" ? "tutor_premium" :
        currentRole === "staff" ? "staff_premium" :
          "student_premium";

      const res = await fetch("https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/stk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          phone: cleanPhone,
          amount: amount,
          planType: planType, // ✅ FIXED: Removed the stray "A"
          userId: session?.user?.id,
          roleAtPayment: currentRole
        })
      });
      const data = await res.json();

      if (res.ok && (data.ResponseCode === "0" || data.CheckoutRequestID)) {
        setOverlayMessage({
          text: `Awesome! We've sent the M-Pesa prompt to ${cleanPhone}. Please check your phone, enter your PIN, and stay right here. We'll automatically upgrade your account the second it's confirmed!`,
          type: 'success'
        });
        startPaymentListener();
      }
      else {
        throw new Error(data.error || data.ResponseDescription || "STK request failed");
      }

    } catch (err: any) {
      setLoading(false);
      setOverlayMessage({
        text: `Payment error: ${err.message}`,
        type: 'error'
      });
    }
  };

  const getDaysRemaining = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // ✅ Conditional return AFTER all hooks
  if (fetchingProfile) {
    return <SubscriptionSkeleton />;
  }

  const isTutor = userRole === "tutor" || userRole === "institution";
  const isStaff = userRole === "staff";

  const plan = isStaff ? {
    id: "staff-2m",
    name: "Staff Premium Access",
    price: PRICES.STAFF.TWO_MONTHS,
    description: "Complete administrative toolkit for staff members to manage content, access CPD, and oversee platform operations.",
    features: [
      "Full access to all student and tutor resources",
      "Unlimited CPD (Continuing Professional Development) classes",
      "Post in Nursmart Marketplace (Jobs, Products, Services)",
      "Post in Student Survival Hub (Resources, Tips, Opportunities)",
      "Student analytics and performance dashboard",
      "Priority support and early access to new features",
      "Upload unlimited resources with auto-approval"
    ],
    icon: <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
  } : isTutor ? {
    id: "tutor-2m",
    name: "Tutor Pro Access",
    price: PRICES.TUTOR.TWO_MONTHS,
    description: "Complete institutional toolkit for educators and training institutions to manage exams, post jobs, and access premium content.",
    features: [
      "Full access to all student resources (notes, quizzes, simulations)",
      "Institutional exam creation & management",
      "Free job posting across our site",
      "Student analytics dashboard",
      "Priority support",
      "Upload unlimited resources with auto-approval"
    ],
    icon: <Crown className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
  } : {
    id: "student-2m",
    name: "Premium Student Access",
    price: PRICES.STUDENT.TWO_MONTHS,
    description: "Complete access to the full academic repository and specialized tools designed for thorough exam preparation and performance tracking.",
    features: [
      "Unrestricted access to premium quizzes and exam-bank questions",
      "Integrated Readiness Proctoriam and DigiProctor practice environments",
      "Personalized grade evolution and goal attainment tracking",
      "Full library of downloadable study guides and technical materials",
      "Priority access to community learning and peer collaboration"
    ],
    icon: <Users className="h-5 w-5 md:h-6 md:w-6 text-indigo-500" />
  };

  const hasActivePlan = !!activeSub;

  return (
    <div className="md:max-w-full md:px-4 lg:px-6 mx-auto p-0 md:p-4 lg:p-8 space-y-0 md:space-y-6">
      {showConfetti && <Confetti />}
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
          durationMonths={PRICES.DURATION.TWO_MONTHS}
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

      {/* Header - full width on mobile */}
      <div className="text-center space-y-1.5 md:space-y-2 px-4 md:px-0 pt-6 md:pt-0 pb-4 md:pb-0 border-0">
        <div className="inline-flex items-center justify-center p-1.5 md:p-2 bg-primary/10 rounded-full mb-1.5 md:mb-2">
          <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-primary mr-1.5 md:mr-2" />
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-primary dark:text-primary/80">Secure Billing</span>
        </div>
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight dark:text-white">
          {isStaff ? "Ready to empower the next generation?" : "Ready to become a confident nurse?"}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-lg dark:text-gray-400">
          You are currently signed in as a <span className="text-foreground font-bold capitalize dark:text-white">{userRole || "Student"}</span>.
          Below is your exclusive {PRICES.DURATION.TWO_MONTHS}-month access plan.
        </p>
      </div>
      <GroupPaySubscriptionCard />
      {/* Active Subscription Status - full width on mobile */}
      {activeSub && (
        <Card className="md:bg-primary/5 dark:md:bg-primary/10 overflow-hidden md:shadow-md rounded-none md:rounded-xl border-0">
          <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="bg-primary p-2 md:p-3 rounded-full">
                <Crown className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-bold flex items-center gap-2 dark:text-white">
                  Active {activeSub.plan_type.toUpperCase()} Plan
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600 dark:bg-green-600 text-[10px] md:text-xs border-0">Active</Badge>
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground italic dark:text-gray-400">
                  Started on {new Date(activeSub.started_at).toLocaleDateString()}
                </p>
                {activeSub.role_at_payment && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    👤 Role: <span className="capitalize">{activeSub.role_at_payment}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-2xl md:text-3xl font-black text-primary dark:text-primary/80">
                {getDaysRemaining(activeSub.expires_at)} Days
              </div>
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground dark:text-gray-400">Remaining</p>
            </div>
          </div>
          <div className="bg-primary/10 dark:bg-primary/20 h-1 w-full">
            <div
              className="bg-primary dark:bg-primary/90 h-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (getDaysRemaining(activeSub.expires_at) / (PRICES.DURATION.TWO_MONTHS * 30)) * 100)}%` }}
            />
          </div>
        </Card>
      )}

      {/* ✅ Role/Subscription mismatch warning with SWITCH BACK functionality */}
      {!activeSub && otherSubscriptions.length > 0 && (
        <div className="p-4 md:p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg md:rounded-xl border-0">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                💡 You have an active subscription for another role!
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                Your subscription is for <strong className="capitalize">{otherSubscriptions[0]?.role_at_payment}</strong> role.
                Please go to Settings to switch your role.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  className="border-0 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => navigate('/settings')}
                >
                  <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
                  Go to Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Role/Subscription mismatch warning for current role mismatch */}
      {activeSub && activeSub.role_at_payment && activeSub.role_at_payment !== userRole && (
        <div className="p-4 md:p-5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg md:rounded-xl border-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                ⚠️ Role & Subscription Mismatch
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                Your subscription is for <strong className="capitalize">{activeSub.role_at_payment}</strong> role,
                but you're currently signed in as <strong className="capitalize">{userRole}</strong>.
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                💡 Please go to Settings to switch your role and access your subscription benefits.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  className="border-0 bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => navigate('/settings')}
                >
                  <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
                  Go to Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-0 md:space-y-2">

        {/* Block 1: Main Pricing Card - full width on mobile */}
        <Card className="md:border-0 md:shadow-2xl overflow-hidden md:rounded-xl dark:md:bg-muted/30 rounded-none border-0 shadow-none">
          <div className="bg-primary/5 p-4 md:p-6 lg:p-8 border-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-1.5 md:gap-2 flex-wrap dark:text-white">
                  {plan.icon} {plan.name}
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 dark:text-gray-400">{PRICES.DURATION.TWO_MONTHS} Months full access</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-2xl md:text-3xl font-black text-primary dark:text-primary/80">KSh {plan.price}</span>
                {isStaff && (
                  <div className="flex items-center gap-1 mt-1">
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[8px] md:text-[10px] font-bold border-0">
                      Best for Staff
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-4 md:p-6 lg:p-8">
            <div className="flex flex-col space-y-3 md:space-y-4">
              <div className="space-y-3 md:space-y-4">
                <p className="text-xs md:text-sm font-bold uppercase text-muted-foreground tracking-widest dark:text-gray-400">What's included</p>
                <ul className="space-y-2 md:space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-medium dark:text-gray-300">
                      <div className="bg-green-100 dark:bg-green-900 p-1 rounded-full flex-shrink-0">
                        <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="break-words">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Staff-only additional features badge */}
                {isStaff && (
                  <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border-0">
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-purple-700 dark:text-purple-300">
                        <p className="font-bold">Staff Exclusive Benefits:</p>
                        <ul className="list-disc list-inside space-y-0.5 mt-1">
                          <li>Unlimited CPD classes and certification</li>
                          <li>Post in Nursmart Marketplace</li>
                          <li>Post in Student Survival Hub</li>
                          <li>Full access to all platform features</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms Agreement Checkbox - SIMPLIFIED */}
              <div className="bg-yellow-50 dark:bg-muted/50 p-3 md:p-4 rounded-lg md:rounded-xl border-0">
                <label className="flex items-start gap-2 md:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAgreedToTerms}
                    onChange={(e) => {
                      setHasAgreedToTerms(e.target.checked);
                      if (e.target.checked) {
                        setShowTermsWarning(false);
                      }
                    }}
                    className="mt-0.5 w-6 h-6 md:w-6 md:h-6 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="flex-1">
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowLegalTerms(true)}
                        className="text-red-600 hover:text-red-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-bold"
                      >
                        Terms & Conditions
                      </button>{" "}
                      including the{" "}
                      <span className="font-bold text-blue-600 dark:text-blue-400">NO REFUND POLICY</span>.
                    </span>
                    <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 mt-0.5 md:mt-1">
                      ⚠️ By checking this box, you acknowledge that all payments are FINAL and NON-REFUNDABLE.
                    </p>
                  </div>
                </label>

                {!hasAgreedToTerms && !showTermsWarning && (
                  <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
                    <span>Please check this box to agree to our Terms & Conditions before proceeding with payment.</span>
                  </p>
                )}

                {showTermsWarning && (
                  <p className="text-[10px] md:text-xs text-red-600 dark:text-red-400 mt-1.5 md:mt-2 animate-pulse font-bold flex items-center gap-1.5">
                    <span className="text-base">⚠️</span>
                    <span>You must agree to the Terms & Conditions before paying!</span>
                  </p>
                )}

                {hasAgreedToTerms && (
                  <p className="text-[10px] md:text-xs text-green-600 dark:text-green-400 mt-1.5 md:mt-2 flex items-center gap-1.5">
                    <span className="font-medium">You have agreed to the Terms & Conditions. You can now proceed with payment.</span>
                  </p>
                )}
              </div>

              {/* Payment Box */}
              <div className="bg-muted/50 dark:bg-gray-800/50 p-4 md:p-6 rounded-xl md:rounded-2xl border-0 space-y-3 md:space-y-4 shadow-inner">
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex justify-between items-center">
                    <Label
                      htmlFor="phone"
                      className="text-[10px] md:text-xs font-bold uppercase text-muted-foreground tracking-wider dark:text-gray-400"
                    >
                      M-Pesa Number
                    </Label>
                    <button
                      onClick={() => setShowInfoOverlay(true)}
                      className="text-[10px] md:text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      <HelpCircle className="h-3 w-3 md:h-3.5 md:w-3.5" />
                      <span>Subscription info</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Smartphone className="absolute left-2.5 md:left-3 top-3 md:top-3.5 h-4 w-4 md:h-5 md:w-5 text-muted-foreground/70 dark:text-gray-500" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="2547XXXXXXXX"
                      className="pl-9 md:pl-11 h-11 md:h-12 bg-background border-0 rounded-lg md:rounded-xl focus-visible:ring-primary focus-visible:ring-offset-2 transition-all text-sm dark:bg-gray-900 dark:text-white"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={hasActivePlan}
                    />
                  </div>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground/80 italic pl-1 break-words dark:text-gray-500">
                    Format: 2547... or 07... (We will format it for you)
                  </p>
                </div>

                <Button
                  className="w-full h-12 md:h-14 text-base md:text-lg font-bold rounded-lg md:rounded-xl shadow-lg transition-all hover:opacity-90 active:scale-[0.98] border-0"
                  onClick={() => handleMpesapayment(plan.id, plan.price)}
                  disabled={loading || hasActivePlan || !hasAgreedToTerms}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  )}
                  {loading ? "Processing..." : hasActivePlan ? "Subscription Active" : `Pay KSh ${plan.price}`}
                </Button>

                <p className="text-[9px] md:text-[10px] text-center text-blue-600 dark:text-blue-400 font-bold mt-1.5 md:mt-2 uppercase tracking-wide">
                  ALL PAYMENTS ARE FINAL AND NON-REFUNDABLE. NO EXCEPTIONS.
                </p>
                <p className="text-[8px] md:text-[9px] text-center text-gray-500 dark:text-gray-500 mt-0.5 md:mt-1">
                  By paying, you waive your right to chargebacks and agree to binding arbitration.
                </p>

                {hasActivePlan && (
                  <p className="text-[10px] md:text-xs text-center text-green-600 dark:text-green-400 font-medium mt-1.5 md:mt-2 break-words">
                    You are all set! Enjoy your active subscription.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Block 2: Transaction History - full width on mobile */}
        <Card className="md:border-none md:bg-muted/30 dark:md:bg-gray-800/30 md:shadow-none md:rounded-2xl rounded-none border-0 shadow-none">
          <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-bold uppercase tracking-widest text-muted-foreground dark:text-gray-400 flex items-center gap-1.5 md:gap-2">
              <Smartphone className="h-3.5 w-3.5 md:h-4 md:w-4" /> Payment History
            </CardTitle>
            <CardDescription className="text-[10px] md:text-xs dark:text-gray-500">
              Your recent payment transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            {transactions.length === 0 ? (
              <div className="text-center py-8 md:py-10 space-y-1.5 md:space-y-2">
                <div className="bg-muted dark:bg-gray-800 p-2 md:p-3 inline-block rounded-full">
                  <Smartphone className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground/50 dark:text-gray-600" />
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground italic dark:text-gray-500">No payment history found.</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground dark:text-gray-500">Complete a payment to see it here</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {transactions.slice(0, 5).map((payment, i) => (
                  <div key={i} className="p-3 md:p-4 bg-card dark:bg-gray-800 rounded-lg md:rounded-xl border-0 md:shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-3">
                    <div className="space-y-0.5 md:space-y-1">
                      <p className="text-[9px] md:text-[10px] font-mono text-muted-foreground dark:text-gray-500 break-all">
                        ID: {payment.transaction_id?.slice(-8) || "pending"}
                      </p>
                      <p className="text-[11px] md:text-xs font-medium dark:text-white">
                        KSh {payment.amount}
                      </p>
                      <p className="text-[9px] md:text-[10px] text-muted-foreground dark:text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={payment.status === "completed" ? "default" : "outline"}
                      className={payment.status === "completed" ? "bg-green-500 hover:bg-green-600 dark:bg-green-600 text-[10px] md:text-xs border-0" : "dark:border-gray-600 dark:text-gray-400 text-[10px] md:text-xs border-0"}>
                      {payment.status === "completed" ? "Success" : payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block 3: Secure Information Message - full width on mobile */}
        <div className="p-4 md:p-6 md:bg-primary/5 dark:md:bg-primary/10 md:rounded-2xl border-0">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="bg-primary/10 dark:bg-primary/20 p-1.5 md:p-2 rounded-lg h-fit w-fit">
              <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-primary/80" />
            </div>
            <div className="space-y-0.5 md:space-y-1 flex-1">
              <h4 className="text-xs md:text-sm font-bold dark:text-white">Secure Payments + Legal Protection</h4>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed dark:text-gray-400">
                Payments are processed via M-Pesa Safaricom. Your subscription activates automatically upon successful payment.
                <strong className="block mt-0.5 md:mt-1 text-red-600 dark:text-red-400">All sales are final with no refunds per our binding Terms & Conditions.</strong>
              </p>
            </div>
            <button
              onClick={() => setShowLegalTerms(true)}
              className="text-[10px] md:text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 whitespace-nowrap font-bold mt-2 sm:mt-0"
            >
              <Gavel className="h-3.5 w-3.5 md:h-4 md:w-4" />
              View Legal Terms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}