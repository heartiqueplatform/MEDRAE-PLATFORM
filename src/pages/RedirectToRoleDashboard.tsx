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
          // 🚪 User not logged in → always go to login
          if (location.pathname !== "/login") navigate("/login");
          setLoading(false);
          return;
        }

        // 2. Fetch role
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
          // 🚫 No profile row → send to login
          if (location.pathname !== "/login") navigate("/login");
          setLoading(false);
          return;
        }

        // 3. Redirect (only if on non-dashboard route)
        if (!location.pathname.startsWith(`/dashboard/${role}`)) {
          navigate(`/dashboard/${role}`);
        }
      } catch (error) {
        console.error("Redirect error:", error);
        navigate("/login"); // fallback
      } finally {
        setLoading(false);
      }
    };

    getRoleAndRedirect();
  }, [navigate, location]);

  // Minimal redirecting message, styled for light + dark themes
  if (loading) {
    return (
      <div className="w-full text-center mt-4 text-blue-600 dark:text-blue-400 font-semibold">
        Heartique redirecting you...
      </div>
    );
  }

  return null;
}
