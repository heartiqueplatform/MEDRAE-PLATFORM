import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { saveLoginInfo, getLoginInfo } from "@/lib/offlineAuth";
import sha256 from "crypto-js/sha256";
import ExitOverlay from "@/components/ExitOverlay";
import GoogleAuthButton from "@/components/google/GoogleAuthButton";
import {
  Mail,
  Lock,
  ArrowRight,
  LogIn,
  LogOut,
  Loader2,
  User,
  ShieldCheck,
  GraduationCap,
  Users
} from 'lucide-react';

// Role configuration for display
const ROLE_CONFIG = {
  student: {
    label: 'Student',
    icon: GraduationCap,
    description: 'Access learning materials and courses',
    color: 'text-blue-600 dark:text-blue-400'
  },
  tutor: {
    label: 'Tutor',
    icon: Users,
    description: 'Create content and teach students',
    color: 'text-emerald-600 dark:text-emerald-400'
  },
  staff: {
    label: 'Staff',
    icon: ShieldCheck,
    description: 'Administrative & management access',
    color: 'text-purple-600 dark:text-purple-400'
  }
};

export function Login() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const backgroundImages = useMemo(() => [
    "high1.png",
    "high2.png",
    "high3.png",
    "high4.png",
    "high5.png",
    "high6.png",
  ], []);

  const [bgIndex, setBgIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [showExitOverlay, setShowExitOverlay] = useState(false);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Check for role change message from navigation state
  useEffect(() => {
    const state = location.state as { message?: string; isFreshStart?: boolean };
    if (state?.message) {
      toast({
        title: "Role Updated",
        description: state.message,
        duration: 5000,
      });
    }
  }, [location]);

  // Slideshow for background images - optimized with useCallback
  useEffect(() => {
    document.documentElement.classList.remove("dark");

    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        setFade(true);
      }, 1000);
    }, 6000);

    return () => clearInterval(interval);
  }, [backgroundImages]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email to reset your password.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/reset-password?email=${encodeURIComponent(email)}`);
  }, [email, navigate]);

  const handleLogin = useCallback(async () => {
    // Prevent multiple submissions
    if (isLoading) return;

    // Validate inputs
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const passwordHash = sha256(password).toString();

    try {
      if (navigator.onLine) {
        // 1. Authenticate user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          throw new Error(error?.message || "Invalid login credentials");
        }

        const userId = data.user.id;

        // 2. Get or create device ID
        let deviceId = localStorage.getItem("device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("device_id", deviceId);
        }

        // 3. Handle sessions (non-blocking)
        try {
          const { data: existingSessions, error: sessionError } = await supabase
            .from("user_sessions")
            .select("*")
            .eq("user_id", userId);

          if (sessionError) throw new Error("Session check failed");

          const currentDeviceSession = existingSessions?.find(
            (s) => s.device_id === deviceId
          );

          if (!currentDeviceSession) {
            if (existingSessions && existingSessions.length >= 2) {
              throw new Error("Maximum devices reached. Log out from another device first.");
            }
            await supabase.from("user_sessions").insert({
              user_id: userId,
              device_id: deviceId,
              device_info: navigator.userAgent,
            });
          }
        } catch (sessionErr) {
          console.error("Session error:", sessionErr);
          // Continue - non-critical
        }

        // 4. Heartbeat (non-blocking)
        try {
          await supabase.rpc('handle_user_heartbeat', {
            p_user_id: userId,
            p_device_id: deviceId
          });
        } catch (heartbeatErr) {
          console.error("Heartbeat error:", heartbeatErr);
          // Continue - non-critical
        }

        // 5. Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (profileError || !profileData) {
          throw new Error("Profile not found. Please contact support.");
        }

        // 6. Save role to localStorage
        const userRole = profileData.role || 'student';
        localStorage.setItem(`userRole_${userId}`, userRole);
        localStorage.setItem("last_known_role", userRole);

        // 7. Save login info for offline mode
        await saveLoginInfo(
          email,
          data.session?.access_token || "",
          passwordHash
        );

        // 8. Get role config for display
        const roleConfig = ROLE_CONFIG[userRole as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.student;
        const roleIcon = roleConfig.icon;
        const roleLabel = roleConfig.label;
        const roleColor = roleConfig.color;

        // 9. Show detailed success toast
        toast({
          title: `Welcome back, ${profileData.name || 'Nurse'}!`,
          description: (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{profileData.name || 'Nurse'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${roleColor}`}>
                  {React.createElement(roleIcon, { className: "w-4 h-4" })}
                </span>
                <span className="text-sm font-medium capitalize">{roleLabel}</span>
              </div>
              {profileData.institution && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {profileData.institution}
                  </span>
                </div>
              )}
            </div>
          ),
          duration: 5000,
        });

        // 10. Clear loading state BEFORE navigation
        setIsLoading(false);

        // 11. Navigate with delay to ensure toast is seen
        setTimeout(() => {
          navigate(`/dashboard/${userRole}`, { replace: true });
        }, 400);

        return;

      } else {
        // Offline mode
        const saved = await getLoginInfo();

        if (saved && saved.username === email && saved.passwordHash === passwordHash) {
          const lastRole = localStorage.getItem("last_known_role");

          toast({
            title: "Offline Mode",
            description: "You are logged in with cached credentials.",
            duration: 4000,
          });

          setIsLoading(false);

          const targetRole = lastRole && ['student', 'tutor', 'staff'].includes(lastRole)
            ? lastRole
            : 'student';

          setTimeout(() => {
            navigate(`/dashboard/${targetRole}`, { replace: true });
          }, 300);

          return;
        } else {
          throw new Error(
            "Offline login failed: no cached credentials or wrong password"
          );
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast({
        title: "Login Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, email, password, navigate]);

  const handleExitApp = useCallback(() => {
    setShowExitOverlay(true);
  }, []);

  const finalExitAction = useCallback(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.quitApp();
    } else {
      alert("Exit successful. Please close the tab.");
      window.location.href = "https://google.com";
    }
  }, []);

  const state = location.state as { message?: string; isFreshStart?: boolean };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-muted/100 dark:bg-muted/100">
      {/* FLOATING EXIT BUTTON */}
      <button
        onClick={handleExitApp}
        className="hidden md:flex fixed top-6 left-6 z-[9999]
             bg-white/10 backdrop-blur-md
             hover:bg-white/20 border border-white/20
             text-white/80 hover:text-white
             py-2 px-4 rounded-xl
             transition-all duration-300 active:scale-95
             items-center gap-2.5 group"
      >
        <LogOut className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:text-red-400 transition-all" />
        <span className="text-[11px] font-medium tracking-widest uppercase">
          Exit System
        </span>
      </button>

      <ExitOverlay
        isOpen={showExitOverlay}
        onExit={finalExitAction}
      />

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
              Secure Access
            </div>
            <h1 className="text-5xl font-bold leading-tight">
              Welcome Back to <br />
              <span>
                <span className="text-red-500 font-black drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">MedRae</span>
                <span className="text-white font-bold"> Nursing</span>
              </span>
            </h1>
            <p className="text-gray-300 text-lg max-w-md">
              Access your medical learning platform and continue your journey to excellence.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Content (Full width on mobile) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 lg:p-12 bg-muted/100 dark:bg-muted/100">
        <div className="w-full max-w-md">
          {/* Branding/Logo */}
          <div className="flex flex-col items-center mb-6 md:mb-8">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-3 mb-4">
              <img
                src="/pwa-192x192.jpeg"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-slate-800 dark:text-white text-3xl font-black tracking-tight">
              Welcome Back
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Sign in to continue your learning
            </p>
            {state?.message && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-700 dark:text-yellow-400 text-center max-w-sm">
                {state.message}
              </div>
            )}
          </div>

          {/* Card with XL rounded corners */}
          <Card className="w-full bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-0 rounded-xl overflow-hidden">
            <CardHeader className="pt-8 px-6 pb-2 text-center">
              <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
                Sign In
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 font-medium pt-1">
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 ml-1">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400">
                      Password
                    </Label>
                    <button
                      onClick={handleForgotPassword}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      disabled={isLoading}
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      type="password"
                      className="pl-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <GoogleAuthButton />
                </div>

                {/* Login Button */}
                <Button
                  disabled={isLoading}
                  onClick={handleLogin}
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all active:scale-[0.98] mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Log In <LogIn className="w-5 h-5" />
                    </span>
                  )}
                </Button>

                {/* Registration Link */}
                <div className="pt-4 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    New to the platform?{" "}
                    <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold inline-flex items-center gap-1 group">
                      Create account <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Footer */}
          <div className="mt-6 flex justify-center gap-3">
            <span
              className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
              onClick={() => navigate("/privacy")}
            >
              Privacy & Policy
            </span>
            <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
            <span
              className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
              onClick={() => navigate("/terms")}
            >
              Terms & Conditions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}