"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export function RedirectToRoleDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRoleAndRedirect = async () => {
      try {
        // 1. Check Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          // 🚪 User logged out → must log in manually
          if (location.pathname !== "/login") navigate("/login");
          setLoading(false);
          return;
        }

        // 2. Fetch role (default student if none found)
        let role = localStorage.getItem("userRole") || "student";
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role) {
          role = profile.role;
          localStorage.setItem("userRole", role);
        } else {
          // 🚫 No profile row → must log in manually
          if (location.pathname !== "/login") navigate("/login");
          setLoading(false);
          return;
        }

        // 3. Redirect only if not already on the correct dashboard
        if (!location.pathname.startsWith(`/dashboard/${role}`)) {
          navigate(`/dashboard/${role}`);
        }
      } catch (error) {
        console.error("Redirect error:", error);
        navigate("/login"); // safer fallback
      } finally {
        setLoading(false);
      }
    };

    getRoleAndRedirect();

    // ✅ Watch for explicit logout → force to /login
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          navigate("/login");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location]);

  if (loading) {
    return (
      <div className="w-full text-center mt-4 text-blue-600 dark:text-blue-400 font-semibold">
        Heartique redirecting you...
      </div>
    );
  }

  return null;
}
