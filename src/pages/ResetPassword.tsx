import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import React from 'react';
import {
  ArrowLeft,
  Mail,
  ShieldQuestion,
  KeyRound,
  ChevronRight,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const backgroundImages = [
  "high1.png",
  "high2.png",
  "high3.png",
  "high4.png",
  "high5.png",
  "high6.png",
];

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [resetQuestion, setResetQuestion] = useState("");
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"request" | "answer" | "newPassword">("request");
  const [bgIndex, setBgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Slideshow for background images
  useEffect(() => {
    const fadeDuration = 1000;
    const displayDuration = 5000;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        setFade(true);
      }, fadeDuration);
    }, displayDuration + fadeDuration);

    return () => clearInterval(interval);
  }, []);

  // Pre-fill email if it comes from query string
  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setStep("answer");
      fetchResetQuestion(emailFromQuery);
    }
  }, [searchParams]);

  // Fetch the security question for a given email
  const fetchResetQuestion = async (email: string) => {
    const { data: userProfile, error } = await supabase
      .from("profiles")
      .select("reset_question")
      .eq("email", email.trim())
      .single();

    if (error || !userProfile) {
      const whatsappNumber = "254704473503";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password for ${email.trim()} but my email is not recognized. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Email not found",
        description: (
          <span>
            To reset your password, you must answer the security question associated with your account.
            If you are unable to provide an answer or need assistance, you can reach our support team directly.
            <br />
            Contact us via{" "}
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    setResetQuestion(userProfile.reset_question || "");
  };

  // Step 1: Request reset
  const handleRequestReset = async () => {
    if (!email.trim()) {
      const whatsappNumber = "254704473503";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password but didn't enter my email. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Email required",
        description: (
          <span>
            To reset your password, you must answer the security question associated with your account.
            If you are unable to provide an answer or need assistance, you can reach our support team directly.
            <br />
            Contact us via{" "}
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    await fetchResetQuestion(email.trim());
    setStep("answer");
  };

  // Step 2: Answer security question
  const handleCheckAnswer = async () => {
    if (!resetAnswer.trim()) {
      const whatsappNumber = "254704473503";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password but didn't provide an answer to the security question. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Answer required",
        description: (
          <span>
            To reset your password, you must answer the security question associated with your account.
            If you are unable to provide an answer or need assistance, you can reach our support team directly.
            <br />
            Contact us via{" "}
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>.
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    const { data: userProfile, error } = await supabase
      .from("profiles")
      .select("user_id, reset_answer")
      .eq("email", email.trim())
      .single();

    if (!userProfile) {
      toast({ title: "Email not found", variant: "destructive" });
      return;
    }

    if ((userProfile.reset_answer || "").trim() !== resetAnswer.trim()) {
      const whatsappNumber = "254704473503";
      const prefilledMessage = encodeURIComponent(
        `Hello, I attempted to reset my password for ${email.trim()} but answered the security question incorrectly. Please assist me.`
      );
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${prefilledMessage}`;

      toast({
        title: "Incorrect answer",
        description: (
          <span className="text-white">
            The answer you provided is incorrect. Please{" "}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-yellow-200"
            >
              contact us on WhatsApp
            </a>{" "}
            for assistance.
          </span>
        ),
        variant: "destructive",
      });

      return;
    }

    setStep("newPassword");
  };

  // Step 3: Update password via Supabase Edge Function
  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        "https://ypgkpecnfziptpmwsdud.supabase.co/functions/v1/reset-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            resetAnswer: resetAnswer.trim(),
            newPassword: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast({
        title: "Password updated",
        description: "You can now log in with your new password.",
      });

      navigate("/login");
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-muted/100 dark:bg-muted/100">
      {/* LEFT SIDE - Background Images (Desktop Only) */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden h-screen sticky top-0">
        {backgroundImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === bgIndex ? "opacity-100 scale-105" : "opacity-0 scale-100"
              }`}
            style={{
              backgroundImage: `url(/${img})`,
              transition: 'opacity 1s ease-in-out, transform 10s linear'
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40">
          <div className="absolute bottom-16 left-12 right-12 text-white space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs font-semibold tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Secure Recovery
            </div>
            <h1 className="text-5xl font-bold leading-tight">
              Reset Your <br />
              <span className="text-blue-400">Password</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-md">
              Follow the steps below to securely reset your account password.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Content (Full width on mobile) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 lg:p-12 bg-muted/100 dark:bg-muted/100">
        <div className="w-full max-w-md">
          {/* Step Indicator Bullets */}
          <div className="flex justify-center gap-2 mb-6">
            {['request', 'answer', 'newPassword'].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? "w-8 bg-blue-500" : "w-2 bg-slate-300 dark:bg-slate-600"
                  }`}
              />
            ))}
          </div>

          <Card className="bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-0 rounded-xl overflow-hidden">
            <CardContent className="p-8 md:p-10">

              {/* STEP 1: REQUEST EMAIL */}
              {step === "request" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">Reset Password</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      Enter your email address and we'll help you recover your account.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1">Email Address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleRequestReset}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all active:scale-[0.98]"
                  >
                    Continue <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* STEP 2: SECURITY QUESTION */}
              {step === "answer" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <ShieldQuestion className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">Security Check</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Please answer the question you set during registration.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <Label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">Your Question</Label>
                      <p className="text-slate-700 dark:text-slate-300 font-semibold">{resetQuestion || "Loading question..."}</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1">Your Answer</Label>
                      <Input
                        value={resetAnswer}
                        onChange={(e) => setResetAnswer(e.target.value)}
                        placeholder="Type your answer here"
                        className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckAnswer}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all"
                  >
                    Verify Identity <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* STEP 3: NEW PASSWORD */}
              {step === "newPassword" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <KeyRound className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">New Password</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Ensure your new password is at least 8 characters long.</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1">New Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 transition-all"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleResetPassword}
                    disabled={isLoading}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        Reset Password <CheckCircle2 className="w-5 h-5" />
                      </span>
                    )}
                  </Button>
                </div>
              )}

              {/* Back to Login Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  Return to Sign In
                </button>
              </div>

            </CardContent>
          </Card>

          {/* Outer Page Footer */}
          <p className="mt-6 text-center text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
            Secure Identity Verification System
          </p>
        </div>
      </div>
    </div>
  );
}