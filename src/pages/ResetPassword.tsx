import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import React from "react";
import {
  ArrowLeft,
  Mail,
  ShieldQuestion,
  KeyRound,
  ChevronRight,
  Lock,
  CheckCircle2,
  GraduationCap,
  Users,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  discoverRolesForEmail,
  getResetQuestionForRole,
  verifyResetAnswerForRole,
  roleFromShadowEmail,
  type Role,
} from "@/lib/multiAccount";

const backgroundImages = [
  "high1.png",
  "high2.png",
  "high3.png",
  "high4.png",
  "high5.png",
  "high6.png",
];

const ROLE_META: Record<
  Role,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  student: { label: "Student", icon: GraduationCap, color: "text-blue-600 dark:text-blue-400" },
  tutor: { label: "Tutor", icon: Users, color: "text-emerald-600 dark:text-emerald-400" },
  staff: { label: "Staff", icon: ShieldCheck, color: "text-purple-600 dark:text-purple-400" },
};

type Step = "request" | "chooseRole" | "answer" | "newPassword" | "support";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [resetQuestion, setResetQuestion] = useState("");
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [step, setStep] = useState<Step>("request");
  const [bgIndex, setBgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // ─── Role-aware state ──────────────────────────────────────
  const [availableRoles, setAvailableRoles] = useState<
    { role: Role; email: string; hasQuestion: boolean }[]
  >([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [resolvedEmail, setResolvedEmail] = useState("");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ─── Background slideshow ──────────────────────────────────
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

  // ─── Pre-fill from query string (?email=...&role=...) ──────
  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    const roleFromQuery = searchParams.get("role");
    if (!emailFromQuery) return;

    setEmail(emailFromQuery);

    // If the user typed a shadow email, derive the role from it.
    const derivedRole =
      (roleFromQuery as Role | null) ||
      roleFromShadowEmail(emailFromQuery);

    // Look up which roles exist, and if a role is known, jump straight in.
    (async () => {
      setIsLookingUp(true);
      try {
        const roles = await discoverRolesForEmail(emailFromQuery);
        if (roles.length === 0) {
          showEmailNotFound(emailFromQuery);
          return;
        }
        setAvailableRoles(roles);

        if (derivedRole && roles.some((r) => r.role === derivedRole)) {
          await selectRole(roles.find((r) => r.role === derivedRole)!);
        } else if (roles.length === 1) {
          await selectRole(roles[0]);
        } else {
          setStep("chooseRole");
        }
      } finally {
        setIsLookingUp(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ─── Helpers ───────────────────────────────────────────────
  const whatsappNumber = "254704473503";

  const whatsappLink = (message: string) =>
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  const showEmailNotFound = (emailValue: string) => {
    toast({
      title: "Email not found",
      description: (
        <span>
          No profile is registered for <b>{emailValue}</b>. If you're sure
          this is your email, please reach out and we'll sort it out.
          <br />
          Contact us via{" "}
          <a
            href={whatsappLink(
              `Hello, I attempted to reset my password for ${emailValue} but my email is not recognized. Please assist me.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            WhatsApp
          </a>
        </span>
      ),
      variant: "destructive",
    });
  };

  // ─── Select a role, load its question (or jump to support) ─
  const selectRole = async (r: {
    role: Role;
    email: string;
    hasQuestion: boolean;
  }) => {
    setSelectedRole(r.role);
    setResolvedEmail(r.email);
    setResetAnswer("");
    setNewPassword("");

    if (!r.hasQuestion) {
      setStep("support");
      return;
    }

    try {
      const { question } = await getResetQuestionForRole(email, r.role);
      setResetQuestion(question || "");
      setStep("answer");
    } catch (err: any) {
      toast({
        title: "Couldn't load security question",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
      setStep("chooseRole");
    }
  };

  // ─── Step 1: Request reset ─────────────────────────────────
  const handleRequestReset = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: (
          <span>
            Please enter the email you registered with. If you need help,
            contact us via{" "}
            <a
              href={whatsappLink(
                `Hello, I attempted to reset my password but didn't enter my email. Please assist me.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              WhatsApp
            </a>
            .
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    setIsLookingUp(true);
    try {
      const roles = await discoverRolesForEmail(email);
      if (roles.length === 0) {
        showEmailNotFound(email.trim());
        return;
      }
      setAvailableRoles(roles);

      if (roles.length === 1) {
        await selectRole(roles[0]);
      } else {
        setStep("chooseRole");
      }
    } catch (err: any) {
      toast({
        title: "Lookup failed",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // ─── Step 2: Verify answer ─────────────────────────────────
  const handleCheckAnswer = async () => {
    if (!resetAnswer.trim() || !selectedRole) {
      toast({
        title: "Answer required",
        description: (
          <span>
            Please type your answer. If you're stuck, contact us via{" "}
            <a
              href={whatsappLink(
                `Hello, I attempted to reset my ${selectedRole ?? ""} password for ${resolvedEmail} but couldn't provide an answer. Please assist me.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              WhatsApp
            </a>
            .
          </span>
        ),
        variant: "destructive",
      });
      return;
    }

    try {
      const { ok, email: resolved } = await verifyResetAnswerForRole(
        email,
        selectedRole,
        resetAnswer
      );

      if (!ok) {
        toast({
          title: "Incorrect answer",
          description: (
            <span className="text-white">
              The answer you provided is incorrect. Please{" "}
              <a
                href={whatsappLink(
                  `Hello, I attempted to reset my ${selectedRole} password for ${resolved} but answered the security question incorrectly. Please assist me.`
                )}
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

      setResolvedEmail(resolved);
      setStep("newPassword");
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  // ─── Step 3: Reset the password via edge function ──────────
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
            email: resolvedEmail,        // ← resolved shadow/base email
            role: selectedRole,          // ← so the server can double-check
            resetAnswer: resetAnswer.trim(),
            newPassword: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // If the server explicitly says "no security question",
        // send the user to the support step rather than showing a raw error.
        if (data?.error === "NO_SECURITY_QUESTION") {
          setStep("support");
          return;
        }
        throw new Error(data.error || "Failed to reset password");
      }

      toast({
        title: "Password updated",
        description: `Your ${ROLE_META[selectedRole ?? "student"].label} password has been reset. You can now log in.`,
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

  // ─── Step bullets (hidden for auxiliary steps) ─────────────
  const showBullets = !["chooseRole", "support"].includes(step);

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
              transition: "opacity 1s ease-in-out, transform 10s linear",
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
          {showBullets && (
            <div className="flex justify-center gap-2 mb-6">
              {(["request", "answer", "newPassword"] as const).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? "w-8 bg-blue-500" : "w-2 bg-slate-300 dark:bg-slate-600"
                    }`}
                />
              ))}
            </div>
          )}

          <Card className="bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-0 rounded-xl overflow-hidden">
            <CardContent className="p-8 md:p-10">
              {/* ═══════════════════════════════════════════════
                  STEP 1: REQUEST EMAIL
                  ═══════════════════════════════════════════════ */}
              {step === "request" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl text-slate-800 dark:text-white">
                      Reset Password
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      Enter your email address and we'll help you recover your account.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1">
                      Email Address
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        disabled={isLookingUp}
                        className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 ml-1 pt-1 leading-snug">
                      Use the <b className="text-slate-800 dark:text-white">primary email</b>{" "}
                      you registered with. We'll show you every profile on this email.
                    </p>
                  </div>

                  <Button
                    onClick={handleRequestReset}
                    disabled={isLookingUp}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all active:scale-[0.98]"
                  >
                    {isLookingUp ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Looking up profiles…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Continue <ChevronRight className="ml-2 w-5 h-5" />
                      </span>
                    )}
                  </Button>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  STEP 1b: CHOOSE WHICH ROLE
                  ═══════════════════════════════════════════════ */}
              {step === "chooseRole" && (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <KeyRound className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl text-slate-800 dark:text-white">
                      Which profile?
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      This email has more than one profile. Pick the one you want
                      to reset.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {availableRoles.map((r) => {
                      const meta = ROLE_META[r.role];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => selectRole(r)}
                          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.99] transition-all text-left"
                        >
                          <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                            <Icon className={`w-5 h-5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold capitalize text-slate-800 dark:text-white">
                              {meta.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {r.email}
                            </p>
                            {!r.hasQuestion && (
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                                No security question set
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setAvailableRoles([]);
                      setSelectedRole(null);
                      setResolvedEmail("");
                    }}
                    className="w-full text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors pt-1"
                  >
                    Use a different email
                  </button>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  STEP 2: SECURITY QUESTION
                  ═══════════════════════════════════════════════ */}
              {step === "answer" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <ShieldQuestion className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h1 className="text-2xl text-slate-800 dark:text-white">
                      Security Check
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      Resetting the{" "}
                      <b className="capitalize text-slate-800 dark:text-white">
                        {selectedRole ? ROLE_META[selectedRole].label : ""}
                      </b>{" "}
                      profile for{" "}
                      <span className="font-mono text-xs">{resolvedEmail}</span>
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                      <Label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1">
                        Your Question
                      </Label>
                      <p className="text-slate-700 dark:text-slate-300 font-semibold">
                        {resetQuestion || "Loading question..."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1">
                        Your Answer
                      </Label>
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

                  {availableRoles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep("chooseRole");
                        setResetAnswer("");
                      }}
                      className="w-full text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      ← Pick a different profile
                    </button>
                  )}
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  STEP 3: NEW PASSWORD
                  ═══════════════════════════════════════════════ */}
              {step === "newPassword" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-2">
                    <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                      <KeyRound className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h1 className="text-2xl text-slate-800 dark:text-white">
                      New Password
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      Choose a new password for your{" "}
                      <b className="capitalize text-slate-800 dark:text-white">
                        {selectedRole ? ROLE_META[selectedRole].label : ""}
                      </b>{" "}
                      profile. Minimum 8 characters.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1">
                      New Password
                    </Label>
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

              {/* ═══════════════════════════════════════════════
                  STEP 4: SUPPORT (no security question on file)
                  ═══════════════════════════════════════════════ */}
              {step === "support" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 text-center">
                  <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-2">
                    <ShieldQuestion className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl text-slate-800 dark:text-white">
                      We need to verify you manually
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      Your{" "}
                      <b className="capitalize text-slate-800 dark:text-white">
                        {selectedRole ? ROLE_META[selectedRole].label : ""}
                      </b>{" "}
                      profile doesn't have a security question on file, so we
                      can't reset it automatically. Contact support and we'll
                      reset it for you quickly.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 text-left space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                      Profile to reset
                    </p>
                    <p className="text-sm font-bold capitalize text-slate-800 dark:text-white">
                      {selectedRole ? ROLE_META[selectedRole].label : ""}
                    </p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all">
                      {resolvedEmail}
                    </p>
                  </div>

                  <a
                    href={whatsappLink(
                      `Hello, I need to reset my ${selectedRole ?? ""} password for ${resolvedEmail}. No security question is on file. Please assist me.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors active:scale-[0.98]"
                  >
                    Contact support on WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(availableRoles.length > 1 ? "chooseRole" : "request");
                      setResetAnswer("");
                      setNewPassword("");
                    }}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {availableRoles.length > 1
                      ? "Pick a different profile"
                      : "Use a different email"}
                  </button>
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