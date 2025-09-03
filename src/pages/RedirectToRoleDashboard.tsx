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
        // 1. Get current session (may restore from storage)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        if (!user) {
          // 🚪 Really logged out
          if (location.pathname !== "/login") navigate("/login");
          setLoading(false);
          return;
        }

        // 2. Get role (with fallback)
        let role = localStorage.getItem("userRole") || "student";
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle(); // ⚡ avoid error if no row

        if (profile?.role) {
          role = profile.role;
          localStorage.setItem("userRole", role);
        }

        // 3. Redirect if not already in correct dashboard
        if (!location.pathname.startsWith(`/dashboard/${role}`)) {
          navigate(`/dashboard/${role}`, { replace: true });
        }
      } catch (error) {
        console.error("Redirect error:", error);
        navigate("/login"); // fallback
      } finally {
        setLoading(false);
      }
    };

    getRoleAndRedirect();

    // ✅ Listen for sign-out only
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          localStorage.removeItem("userRole"); // clear cache
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
