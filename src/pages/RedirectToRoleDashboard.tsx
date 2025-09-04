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
        // 1. Try localStorage first
        const cachedRole = localStorage.getItem("userRole");
        const cachedSession = localStorage.getItem("userSession");
        let role = cachedRole || "student";
        let session = cachedSession ? JSON.parse(cachedSession) : null;

        if (!session) {
          // If no cached session, get it fresh
          const {
            data: { session: freshSession },
          } = await supabase.auth.getSession();
          session = freshSession;

          if (session) {
            localStorage.setItem("userSession", JSON.stringify(session));
          }
        }

        const user = session?.user;
        if (!user) {
          // 🚪 Really logged out
          if (location.pathname !== "/login") navigate("/login");
          setLoading(false);
          return;
        }

        // 2. Refresh role if not cached
        if (!cachedRole) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.role) {
            role = profile.role;
            localStorage.setItem("userRole", role);
          }
        }

        // 3. Navigate only if needed
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

    // ✅ Listen for logout only
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          localStorage.removeItem("userRole");
          localStorage.removeItem("userSession");
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
      <div
        className="flex items-center justify-center h-screen w-screen text-center text-blue-600 dark:text-blue-400 font-semibold bg-cover bg-center"
        style={{ backgroundImage: "url('/background07.jpg')" }}
      >
        <div className="bg-white/70 dark:bg-black/60 px-6 py-4 rounded-2xl shadow-lg">
          Heartique redirecting you...
        </div>
      </div>
    );
  }

  return null;
}
