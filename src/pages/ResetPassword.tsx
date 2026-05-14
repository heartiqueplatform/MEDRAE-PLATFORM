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


export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [resetQuestion, setResetQuestion] = useState("");
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"request" | "answer" | "newPassword">("request");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const backgroundImages = [
    "/high1.png",
    "/high2.png",
    "/high3.png",
    "/high4.png",
    "/high5.png",
    "/high6.png",
  ];

  const [bgIndex, setBgIndex] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const fadeDuration = 1000;  // 1s fade
    const displayDuration = 5000; // 5s per image

    const interval = setInterval(() => {
      setFade(false); // start fade out
      setTimeout(() => {
        setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        setFade(true); // fade in next image
      }, fadeDuration);
    }, displayDuration + fadeDuration);

    return () => clearInterval(interval);
  }, []);
  // Pre-fill email if it comes from query string
  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setStep("answer"); // skip request step if email is provided
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
        variant: "destructive", // keeps the red background
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
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-center items-center font-sans p-4">

      {/* Background Slideshow (Matches Login/Register) */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105 ${fade ? "opacity-100" : "opacity-0"
          }`}
        style={{
          backgroundImage: `url('${backgroundImages[bgIndex]}')`,
          filter: 'brightness(0.65)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none"></div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">

        {/* Step Indicator Bullets */}
        <div className="flex justify-center gap-2 mb-6">
          {['request', 'answer', 'newPassword'].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? "w-8 bg-blue-500" : "w-2 bg-white/40"
                }`}
            />
          ))}
        </div>

        <Card className="bg-white/95 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-none rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-10">

            {/* STEP 1: REQUEST EMAIL */}
            {step === "request" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-800">Reset Password</h1>
                  <p className="text-slate-500 text-sm font-medium">
                    Enter your email address and we'll help you recover your account.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-12 h-12 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleRequestReset}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                >
                  Continue <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {/* STEP 2: SECURITY QUESTION */}
            {step === "answer" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldQuestion className="w-8 h-8 text-amber-600" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-800">Security Check</h1>
                  <p className="text-slate-500 text-sm font-medium">Please answer the question you set during registration.</p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Your Question</Label>
                    <p className="text-slate-700 font-semibold">{resetQuestion || "Loading question..."}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">Your Answer</Label>
                    <Input
                      value={resetAnswer}
                      onChange={(e) => setResetAnswer(e.target.value)}
                      placeholder="Type your answer here"
                      className="h-12 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCheckAnswer}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all"
                >
                  Verify Identity <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === "newPassword" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="text-center space-y-2">
                  <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                    <KeyRound className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-800">New Password</h1>
                  <p className="text-slate-500 text-sm font-medium">Ensure your new password is at least 8 characters long.</p>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-12 h-12 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleResetPassword}
                  disabled={isLoading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98]"
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
            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Return to Sign In
              </button>
            </div>

          </CardContent>
        </Card>

        {/* Outer Page Footer */}
        <p className="mt-8 text-center text-white/60 text-xs font-bold uppercase tracking-widest">
          Secure Identity Verification System
        </p>
      </div>
    </div>
  );
}