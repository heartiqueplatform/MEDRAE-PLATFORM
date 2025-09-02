"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient"; // adjust path if needed

export function RedirectToRoleDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const getRoleAndRedirect = async () => {
      try {
        // 1. Check Supabase session
       const { data: { session } } = await supabase.auth.getSession();
const user = session?.user;


        let role = localStorage.getItem("userRole") || "student";

        // 2. If logged in, fetch role from profile table
        if (user) {
          const { data: profile } = await supabase
            .from("profiles") // <-- change table name if different
            .select("role")
            .eq("id", user.id)
            .single();

          if (profile?.role) {
            role = profile.role;
            localStorage.setItem("userRole", role); // sync localStorage
          }
        }

        // 3. Redirect
        navigate(`/dashboard/${role}`);
      } catch (error) {
        console.error("Redirect error:", error);
        navigate("/dashboard/student"); // safe fallback
      }
    };

    getRoleAndRedirect();
  }, [navigate]);

  return <p className="text-center mt-10">Redirecting to your dashboard...</p>;
}
