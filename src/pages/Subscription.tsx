import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Calendar, Users, Smartphone, Crown } from "lucide-react";

export function Subscription() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const currentPlan = "Free";

  const studentPlans = [
    {
      id: "pro",
      name: "Pro",
      price: 99,
      yearlyPrice: 99 * 12,
      description: "Perfect for serious learners",
      features: [
        "Unlimited quizzes",
        "Advanced progress tracking",
        "Priority support",
        "Download study materials",
        "AI study assistant"
      ],
      popular: true,
      billingType: "both"
    },
    {
      id: "premium",
      name: "Premium",
      price: 450,
      yearlyPrice: 450,
      description: "Annual plan for committed learners",
      features: [
        "Everything in Pro",
        "Offline access",
        "Video content library",
        "Advanced analytics",
        "Certificate programs"
      ],
      popular: false,
      billingType: "yearly"
    }
  ];

  const tutorPlans = [
    {
      id: "tutor-basic",
      name: "Tutor Plan",
      price: 500,
      yearlyPrice: 500,
      description: "Start teaching with essential tools",
      features: [
        "Create and share content",
        "Student progress tracking",
        "Basic analytics",
        "Community access"
      ],
      billingType: "yearly"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Subscription & Billing
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose the perfect plan for your learning journey
        </p>
      </div>

      <Tabs defaultValue="student" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Student Plans
          </TabsTrigger>
          <TabsTrigger value="tutor" className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Tutor Plans
          </TabsTrigger>
        </TabsList>

        {/* Student Plans */}
        <TabsContent value="student" className="space-y-6">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={billingCycle === "monthly" ? "font-semibold" : "text-muted-foreground"}>Monthly</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Switch to {billingCycle === "monthly" ? "Yearly" : "Monthly"}
            </Button>
            <span className={billingCycle === "yearly" ? "font-semibold" : "text-muted-foreground"}>
              Yearly <Badge variant="secondary" className="ml-1">Best Value</Badge>
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {studentPlans.map((plan) => (
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
                      <span className="text-3xl font-bold">
                        {plan.billingType === "yearly"
                          ? `KSh ${plan.yearlyPrice}`
                          : billingCycle === "yearly"
                            ? `KSh ${plan.yearlyPrice}`
                            : `KSh ${plan.price}`}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.billingType === "yearly" ? "year" : billingCycle === "yearly" ? "year" : "month"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full"
                    onClick={() => window.location.href = "https://heartique-platform-payment-system.vercel.app/"}
                  >
                    Choose {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tutor Plans */}
        <TabsContent value="tutor" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1">
            {tutorPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    {plan.name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-2xl font-bold">
                    KSh {plan.yearlyPrice}
                    <span className="text-sm font-normal text-muted-foreground">/year</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full"
                    onClick={() => window.location.href = "https://heartique-platform-payment-system.vercel.app/"}
                  >
                    Choose {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Secure payment options available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-4 text-center">
              <h3 className="font-semibold mb-2">M-Pesa</h3>
              <p className="text-sm text-muted-foreground">Pay using your mobile money account</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <h3 className="font-semibold mb-2">Credit/Debit Card</h3>
              <p className="text-sm text-muted-foreground">Visa, Mastercard accepted</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
