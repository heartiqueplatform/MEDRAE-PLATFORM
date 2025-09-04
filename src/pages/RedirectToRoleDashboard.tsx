"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export function RedirectToRoleDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Check cache immediately
  const [cachedSession] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userSession");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });

  const [cachedRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userRole");
    }
    return null;
  });

  const [loading, setLoading] = useState(!cachedSession); // 🚀 Only load if no cache

  useEffect(() => {
    const getRoleAndRedirect = async () => {
      try {
        let role = cachedRole || "student";
        let session = cachedSession;

        if (!session) {
          // Fetch fresh session
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
          if (location.pathname !== "/login") navigate("/login");
          setLoading(false);
          return;
        }

        // Refresh role if missing
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

        // Navigate only if needed
        if (!location.pathname.startsWith(`/dashboard/${role}`)) {
          navigate(`/dashboard/${role}`, { replace: true });
        }
      } catch (error) {
        console.error("Redirect error:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    getRoleAndRedirect();

    // ✅ Listen for logout only
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("userRole");
        localStorage.removeItem("userSession");
        navigate("/login");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, location, cachedRole, cachedSession]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen w-screen text-center text-blue-600 dark:text-blue-400 font-semibold bg-cover bg-center"
        style={{ backgroundImage: "url('/background07.jpg')" }}
      >
        <div className="bg-white/70 dark:bg-black/60 px-6 py-4 rounded-2xl shadow-lg animate-fade-in">
          Heartique redirecting you...
        </div>
      </div>
    );
  }

  return null;
}
