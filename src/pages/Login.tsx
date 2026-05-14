import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { saveLoginInfo, getLoginInfo } from "@/lib/offlineAuth";
import sha256 from "crypto-js/sha256"; // For hashing passwords offline
import React from 'react';
import {
  Mail,
  Lock,
  ArrowRight,
  LogIn,
  KeyRound,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';

export function Login() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Step 1: Background image slideshow setup
  const backgroundImages = [
    "high1.png",
    "high2.png",
    "high3.png",
    "high4.png",
    "high5.png",
    "high6.png",
  ];

  const [bgIndex, setBgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Step 2: Dark mode off + slideshow
  useEffect(() => {
    document.documentElement.classList.remove("dark");

    const interval = setInterval(() => {
      setFade(false); // start fade out

      setTimeout(() => {
        setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        setFade(true); // fade in new image
      }, 1000); // fade duration 1s
    }, 5000); // change image every 7s

    return () => clearInterval(interval);
  }, []);
  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email to reset your password.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/reset-password?email=${encodeURIComponent(email)}`);
  };

  const handleLogin = async () => {

    setIsLoading(true);


    const passwordHash = sha256(password).toString();

    try {
      if (navigator.onLine) {
        // ---------------- Online Login ----------------
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log("LOGIN DATA:", data);
        console.log("LOGIN ERROR:", error);
        if (error || !data.user) {
          throw new Error(error?.message || "Invalid login credentials");
        }

        const userId = data.user.id;


        // ---------------- Device Session Control ----------------

        // Device ID (persistent per browser)
        let deviceId = localStorage.getItem("device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("device_id", deviceId);
        }

        // Check existing sessions for this user
        const { data: existingSessions, error: sessionError } = await supabase
          .from("user_sessions")
          .select("*")
          .eq("user_id", userId);

        if (sessionError) throw new Error("Session check failed");

        // Check if this device already has a session
        const currentDeviceSession = existingSessions?.find(
          (s) => s.device_id === deviceId
        );

        // If device already registered → update activity
        if (currentDeviceSession) {
          await supabase
            .from("user_sessions")
            .update({ last_active: new Date().toISOString() })
            .eq("id", currentDeviceSession.id);
        } else {
          // New device login
          if (existingSessions.length >= 2) {
            throw new Error(
              "Maximum devices reached. Log out from another device first."
            );
          }

          // Register new device session
          await supabase.from("user_sessions").insert({
            user_id: userId,
            device_id: deviceId,
            device_info: navigator.userAgent,
          });
        }

        await supabase
          .from("profiles")
          .update({
            is_online: true,
            last_seen: new Date().toISOString(),
          })
          .eq("user_id", userId);
        // ---------------- Fetch user profile ----------------
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileError || !profileData) {
          throw new Error("Profile not found.");
        }

        // Save offline login
        await saveLoginInfo(
          email,
          data.session?.access_token || "",
          passwordHash
        );

        toast({
          title: "Login successful!",
          description: `Welcome back!`,
        });

        // ---------------- Navigate to role-specific dashboard ----------------
        if (profileData.role === "student") navigate("/dashboard/student", { replace: true });
        else if (profileData.role === "tutor") navigate("/dashboard/tutor", { replace: true });
        else if (profileData.role === "staff") navigate("/dashboard/staff", { replace: true });
        else navigate("/"); // fallback if role missing

      } else {
        // ---------------- Offline Login ----------------
        const saved = await getLoginInfo();

        if (saved && saved.username === email && saved.passwordHash === passwordHash) {
          toast({
            title: "Offline login successful!",
            description: `Welcome back (Offline Mode)`,
          });

          // Navigate to a generic dashboard (offline, role unknown)
          navigate("/dashboard", { replace: true });
        } else {
          throw new Error(
            "Offline login failed: no cached credentials or wrong password"
          );
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast({
        title: "Login failed",
        description: err.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleExitApp = () => {
    const confirmed = window.confirm("Are you sure you want to exit the Medrae Nursing?");
    if (confirmed) {
      // Check if we are running as a laptop app
      if ((window as any).electronAPI) {
        (window as any).electronAPI.quitApp();
      } else {
        // If we are just in a browser, just alert
        alert("Exit command sent (This only works in the Desktop App)");
      }
    }
  };


  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans flex flex-col justify-center items-center p-4">
      {/* FLOATING EXIT BUTTON */}
      <button
        onClick={handleExitApp}
        className="fixed top-4 left-4 z-[9999] bg-red-600 hover:bg-red-700 text-white p-3 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-2 font-black text-[10px] border-2 border-white"
      >
        <LogOut className="h-4 w-4" />
        EXIT MEDRAE
      </button>
      {/* Background image with refined transition */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105 ${fade ? "opacity-100" : "opacity-0"
          }`}
        style={{
          backgroundImage: `url('${backgroundImages[bgIndex]}')`,
          filter: 'brightness(0.7)' // Darken for better contrast
        }}
      ></div>

      {/* Modern Radial Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60"></div>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">

        {/* Branding/Logo above the card */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-2xl p-3 mb-4 animate-bounce-slow">
            <img
              src="/pwa-192x192.jpeg"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight drop-shadow-md">
            Welcome Back
          </h1>
        </div>

        <Card className="w-full bg-white/95 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-none rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-10 px-8 pb-2 text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">
              Sign In
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium pt-1">
              Please enter your credentials to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <div className="space-y-5">

              {/* Email Field */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-slate-500 ml-1">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    className="pl-12 h-12 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label className="text-xs uppercase tracking-widest font-bold text-slate-500">
                    Password
                  </Label>
                  <button
                    onClick={handleForgotPassword}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    type="password"
                    className="pl-12 h-12 bg-slate-50 border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Login Button */}
              <Button
                disabled={isLoading}
                onClick={handleLogin}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] mt-4"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Log In <LogIn className="w-5 h-5" />
                  </span>
                )}
              </Button>

              {/* Registration Link */}
              <div className="pt-6 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  New to the platform?{" "}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-1 group">
                    Create account <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Support Footer */}
        <div className="mt-8 flex justify-center gap-6">
          <span
            className="mx-1 underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-white hover:text-blue-800 transition-colors font-bold"
            onClick={() => navigate("/privacy")}
          >
            Privacy & Policy
          </span>.
          <span
            className="mx-1 underline decoration-blue-200 decoration-2 underline-offset-4 cursor-pointer text-white hover:text-blue-800 transition-colors font-bold"
            onClick={() => navigate("/terms")}
          >
            Terms & Conditions
          </span>.
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}