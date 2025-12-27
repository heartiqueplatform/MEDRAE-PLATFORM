"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Smartphone, Users, Crown } from "lucide-react";

export function Subscription() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  const studentPlans = [
    {
      id: "pro",
      name: "Pro",
      price: 99,
      description: "Perfect for serious learners",
      features: ["Unlimited quizzes", "Advanced progress tracking", "Priority support", "Download study materials", "AI study assistant"],
      popular: true,
      period: "month"  // <-- add this
    },
    {
      id: "premium",
      name: "Premium",
      price: 450,
      description: "For committed learners",
      features: ["Everything in Pro", "Offline access", "Video content library", "Advanced analytics", "Certificate programs"],
      popular: false,
      period: "year"  // <-- add this
    }
  ];

  const tutorPlans = [
    {
      id: "tutor-basic",
      name: "Tutor Plan",
      price: 500,
      description: "Start teaching with essential tools",
      features: ["Create and share content", "Student progress tracking", "Basic analytics", "Community access"]
    }
  ];

  const handleMpesapayment = async (planId: string, amount: number) => {
    setLoading(true);
    setMessage("");

    try {
      const phone = prompt("Enter your phone number in format 2547XXXXXXXX:");
      if (!phone) throw new Error("Phone number is required");

      const res = await fetch("https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amount })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "STK request failed");

      setMessage(`STK Request sent! CheckoutRequestID: ${data.CheckoutRequestID}`);
    } catch (err: any) {
      setMessage(`Payment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/stk-callback");
        if (!res.ok) return;
        const data = await res.json();
        setTransactions(data || []);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative space-y-6">

      {/* Free Trial Overlay (only over subscription page content) */}
      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-lg z-30">
        <div className="bg-gradient-to-br from-blue-900 via-indigo-800 to-blue-700 p-8 rounded-2xl shadow-2xl text-center max-w-md text-white">
          <h2 className="text-3xl font-extrabold mb-3">Free Trial Active</h2>
          <p className="text-blue-100 mb-6 leading-relaxed">
            You are currently on a <span className="font-semibold text-white">3-month free trial</span>.
            Payments are disabled while we finalize subscriptions.
          </p>
          <Badge className="bg-green-500 text-white px-4 py-1 rounded-full text-sm tracking-wide shadow-md">
            Free Mode
          </Badge>
        </div>
      </div>


      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose the perfect plan for your learning journey
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="student" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Student Plans
          </TabsTrigger>
          <TabsTrigger value="tutor" className="flex items-center gap-2">
            <Crown className="h-4 w-4" /> Tutor Plans
          </TabsTrigger>
        </TabsList>

        {/* Student Plans */}
        <TabsContent value="student" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {studentPlans.map(plan => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">KSh {plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>

                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => handleMpesapayment(plan.id, plan.price)}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Pay with M-Pesa"}
                  </Button>
                  {message && <p className="mt-2 text-sm text-blue-600">{message}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tutor Plans */}
        <TabsContent value="tutor" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1">
            {tutorPlans.map(plan => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-2xl font-bold">
                    KSh {plan.price}<span className="text-sm font-normal text-muted-foreground">/year</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => handleMpesapayment(plan.id, plan.price)}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Pay with M-Pesa"}
                  </Button>
                  {message && <p className="mt-2 text-sm text-blue-600">{message}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" /> Recent Payments
          </CardTitle>
          <CardDescription>
            Real-time M-Pesa payment statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent transactions</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx, i) => (
                <li key={i} className="border p-2 rounded flex justify-between items-center">
                  <span>Checkout ID: {tx.checkout_request_id}</span>
                  <span className={tx.result_code === 0 ? "text-green-600" : "text-red-600"}>
                    {tx.result_desc}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
