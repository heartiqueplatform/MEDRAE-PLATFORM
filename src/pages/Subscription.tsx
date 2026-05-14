"use client";

import { useState, useEffect } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, Smartphone, Users, Crown, Loader2, AlertCircle } from "lucide-react";
import { GlobalLoader } from "@/components/GlobalLoader";
export function Subscription() {
  const session = useSession();
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [message, setMessage] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<any>(null);

  // 1. Load User Profile, Role, and Active Subscription
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.id) return;

      try {
        // Fetch Profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, phone")
          .eq("user_id", session.user.id)
          .single();

        if (profile) {
          setUserRole(profile.role?.toLowerCase());
          if (profile.phone) setPhoneNumber(profile.phone);
        }

        // FETCH ACTIVE SUBSCRIPTION
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub) {
          setActiveSub(sub);
          console.log("DEBUG: Active subscription found:", sub);
        }
      } catch (err) {
        console.error("DEBUG: Error loading data:", err);
      } finally {
        setFetchingProfile(false);
      }
    }

    loadProfile();
  }, [session, supabase]);
  // 1. Load User Profile & Role
  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.id) {
        console.log("DEBUG: No active session found.");
        return;
      }

      console.log("DEBUG: Fetching profile for user:", session.user.id);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, phone")
          .eq("user_id", session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          console.log("DEBUG: Profile found:", data);
          setUserRole(data.role?.toLowerCase());
          if (data.phone) setPhoneNumber(data.phone);
        }
      } catch (err) {
        console.error("DEBUG: Error loading profile:", err);
      } finally {
        setFetchingProfile(false);
      }
    }

    loadProfile();
  }, [session, supabase]);

  // 2. Fetch Transactions Interval
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch("https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/stk-callback");
        if (res.ok) {
          const data = await res.json();
          setTransactions(data || []);
        }
      } catch (err) {
        console.error("DEBUG: Error fetching transaction history:", err);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  // 3. Payment Handler
  const handleMpesapayment = async (planId: string, amount: number) => {
    // 1. Clean the phone number (Remove +, spaces, and replace leading 0 with 254)
    let cleanPhone = phoneNumber.replace(/\D/g, ""); // Remove everything except numbers

    if (cleanPhone.startsWith("0")) {
      cleanPhone = "254" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("7") || cleanPhone.startsWith("1")) {
      cleanPhone = "254" + cleanPhone;
    }

    // 2. Validate length (Must be 254 + 9 digits = 12 total)
    if (cleanPhone.length !== 12) {
      console.error("DEBUG: Invalid phone length:", cleanPhone);
      setMessage("Please enter a valid M-Pesa number (e.g. 0712345678)");
      return;
    }

    console.log("DEBUG: Starting payment process...");
    console.log("DEBUG: Sanitized Phone:", cleanPhone);
    console.log("DEBUG: Payload:", { phone: cleanPhone, amount, planId, userId: session?.user?.id });

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone, // Use the cleaned phone number
          amount: amount,
          planId: planId,
          userId: session?.user?.id
        })
      });

      console.log("DEBUG: Response status:", res.status);
      const data = await res.json();
      console.log("DEBUG: Backend response data:", data);

      if (!res.ok) {
        // Handle the specific error message from your backend
        const errorMsg = data.errorMessage || data.error || "STK request failed";
        throw new Error(errorMsg);
      }

      setMessage(`Request sent! Please check your phone (${cleanPhone}) to enter your M-Pesa PIN.`);
    } catch (err: any) {
      console.error("DEBUG: Payment execution error:", err.message);
      setMessage(`Payment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  const getDaysRemaining = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };
  if (fetchingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <GlobalLoader />
        <p className="text-muted-foreground animate-pulse font-medium">Configuring your personal plan...</p>
      </div>
    );
  }

  // Determine which plan data to show based on role
  const isTutor = userRole === "tutor" || userRole === "institution";
  const plan = isTutor ? {
    id: "tutor-3m",
    name: "Institution / Tutor Plan",
    price: 599,
    description: "Professional tools for educators and institutions",
    features: ["Create & share content", "Student progress tracking", "Advanced analytics", "Priority community support"],
    icon: <Crown className="h-6 w-6 text-yellow-500" />
  } : {
    id: "student-3m",
    name: "Student Plan",
    price: 299,
    description: "Everything you need to excel in your studies",
    features: ["Unlimited quizzes", "Progress tracking", "Download materials", "AI Study assistant"],
    icon: <Users className="h-6 w-6 text-primary" />
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-4">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-2">
          <CreditCard className="h-5 w-5 text-primary mr-2" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Secure Billing</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Ready to start your journey?
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          You are currently signed in as a <span className="text-foreground font-bold capitalize">{userRole || "Student"}</span>.
          Below is your exclusive 3-month access plan.
        </p>
      </div>
      {/* Active Subscription Status */}
      {activeSub && (
        <Card className="border-primary/50 bg-primary/5 overflow-hidden border-2 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-3 rounded-full">
                <Crown className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  Active {activeSub.plan_type.toUpperCase()} Plan
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  Started on {new Date(activeSub.started_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="text-center md:text-right">
              <div className="text-3xl font-black text-primary">
                {getDaysRemaining(activeSub.expires_at)} Days
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Remaining</p>
            </div>
          </div>
          <div className="bg-primary/10 h-1 w-full">
            <div
              className="bg-primary h-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (getDaysRemaining(activeSub.expires_at) / 90) * 100)}%` }}
            />
          </div>
        </Card>
      )}
      <div className="grid lg:grid-cols-12 gap-2 items-start">

        {/* Main Pricing Card */}
        <Card className="lg:col-span-7 border-2 border-primary/20 shadow-2xl overflow-hidden rounded-2xl">
          <div className="bg-primary/5 p-6 border-b border-primary/10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {plan.icon} {plan.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">3 Months full access</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-primary">KSh {plan.price}</span>
            </div>
          </div>

          <CardContent className="p-8 space-y-2">
            <div className="grid md:grid-cols-2 gap-2">
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase text-muted-foreground tracking-widest">What's included</p>
                <ul className="space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check className="h-3 w-3 text-green-600" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Box */}
              {/* Updated Payment Box - Dark Mode Friendly */}
              <div className="bg-muted/50 p-6 rounded-2xl border border-border/50 space-y-4 shadow-inner">
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-bold uppercase text-muted-foreground tracking-wider"
                  >
                    M-Pesa Number
                  </Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground/70" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="2547XXXXXXXX"
                      /* Removed bg-white, added bg-background and theme-aware borders */
                      className="pl-11 h-12 bg-background border-input rounded-xl focus-visible:ring-primary focus-visible:ring-offset-2 transition-all"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/80 italic pl-1">
                    Format: 2547... or 07... (We'll format it for you)
                  </p>
                </div>

                <Button
                  className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
                  onClick={() => handleMpesapayment(plan.id, plan.price)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-5 w-5" />
                  )}
                  {loading ? "Processing..." : `Pay KSh ${plan.price}`}
                </Button>
              </div>
            </div>

            {message && (
              <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-semibold border ${message.includes("failed")
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-blue-50 border-blue-200 text-blue-700"
                }`}>
                <AlertCircle className="h-5 w-5 shrink-0" />
                {message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History Column */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none bg-muted/30 shadow-none rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Live Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="bg-muted p-3 inline-block rounded-full">
                    <Smartphone className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground italic">No recent transactions found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx, i) => (
                    <div key={i} className="p-4 bg-white rounded-xl border border-border shadow-sm flex justify-between items-center group transition-hover hover:border-primary/50">
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono text-muted-foreground">ID: ...{tx.checkout_request_id?.slice(-8)}</p>
                        <p className="text-xs font-bold truncate max-w-[180px]">{tx.result_desc}</p>
                      </div>
                      <Badge variant={tx.result_code === 0 ? "default" : "outline"} className={tx.result_code === 0 ? "bg-green-500 hover:bg-green-600" : ""}>
                        {tx.result_code === 0 ? "Success" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secure Information */}
          <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex gap-4">
              <div className="bg-primary/10 p-2 rounded-lg h-fit">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Secure Payments</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Payments are processed via M-Pesa Safaricom. Your session is encrypted and secure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}