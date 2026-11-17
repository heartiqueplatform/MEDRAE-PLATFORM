"use client";

import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export function RedirectToRoleDashboard() {
  // ─── Synchronous decision on first render ───
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("supabaseUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const cachedRole = storedUser
    ? localStorage.getItem(`userRole_${storedUser.id}`)
    : null;
  const lastKnown = localStorage.getItem("last_known_role");

  // Background role correction — runs regardless of which branch we take.
  useEffect(() => {
    if (!storedUser?.id) return;
    if (!navigator.onLine) return;
    // Only fetch if we don't have a cached role OR we want to verify.
    // For speed, only fetch when we have no cached role.
    if (cachedRole) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", storedUser.id)
          .single();
        if (!cancelled && data?.role) {
          localStorage.setItem(`userRole_${storedUser.id}`, data.role);
          localStorage.setItem("last_known_role", data.role);
        }
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [storedUser?.id, cachedRole]);

  if (!storedUser) return <Navigate to="/login" replace />;
  if (cachedRole) return <Navigate to={`/dashboard/${cachedRole}`} replace />;
  if (lastKnown === "student" || lastKnown === "tutor" || lastKnown === "staff") {
    return <Navigate to={`/dashboard/${lastKnown}`} replace />;
  }

  // Last resort — no cache at all. Default to student, background fetch corrects.
  return <Navigate to="/dashboard/student" replace />;
}