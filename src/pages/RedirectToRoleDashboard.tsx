"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export function RedirectToRoleDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirectUser = async () => {
      try {
        // Always get fresh session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;

        // If no user → go to login
        if (!user) {
          navigate("/login", { replace: true });
          return;
        }

        // Fetch role directly from DB (source of truth)
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error || !profile?.role) {
          navigate("/login", { replace: true });
          return;
        }

        const role = profile.role;

        // Redirect only if not already on correct dashboard
        if (!location.pathname.startsWith(`/dashboard/${role}`)) {
          navigate(`/dashboard/${role}`, { replace: true });
        }
      } catch (err) {
        console.error("Redirect error:", err);
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    redirectUser();

    // Listen for logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        localStorage.clear(); // prevent ghost data
        navigate("/login", { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  if (loading) return null;

  return null;
}