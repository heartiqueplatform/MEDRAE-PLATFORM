"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
// RedirectToRoleDashboard.tsx
export function RedirectToRoleDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const doRedirect = async () => {
      const storedUser = localStorage.getItem("supabaseUser");
      if (!storedUser) {
        navigate("/login", { replace: true });
        return;
      }
      const user = JSON.parse(storedUser);

      const cachedRole = localStorage.getItem(`userRole_${user.id}`);
      if (cachedRole) {
        navigate(`/dashboard/${cachedRole}`, { replace: true });
        return;
      }
      // If online, try to fetch fresh role
      if (navigator.onLine) {
        const { data } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
        if (data?.role) {
          localStorage.setItem(`userRole_${user.id}`, data.role);
          navigate(`/dashboard/${data.role}`, { replace: true });
          return;
        }
      }
      // Fallback
      navigate("/login", { replace: true });
    };
    doRedirect();
  }, [navigate]);
  return null;
}