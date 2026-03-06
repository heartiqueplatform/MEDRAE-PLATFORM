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
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden font-sans flex justify-center items-center">
      {/* Background image */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${fade ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundImage: `url('${backgroundImages[bgIndex]}')` }}
      ></div>

      {/* Optional overlay for readability */}
      <div className="absolute inset-0 bg-black opacity-20"></div>

      {/* Your card */}
      <div className="relative z-10 w-full flex justify-center items-center px-3 pt-40">
        <Card className="w-full max-w-xl bg-white shadow-lg rounded-2xl">
          {/* Keep your CardHeader and CardContent exactly as is */}
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-2xl font-bold">
              <img
                src="/pwa-192x192.jpeg"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
              <span>Hey there, welcome back! Log in</span>
            </CardTitle>
            <CardDescription>Enter your email and password</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your secure password"
              />

              <Button disabled={isLoading} onClick={handleLogin}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>

              <p
                className="text-sm text-blue-600 hover:underline cursor-pointer mt-2"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don’t have an account?{" "}
                <Link to="/register" className="text-blue-600 hover:underline font-medium">
                  Register here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}