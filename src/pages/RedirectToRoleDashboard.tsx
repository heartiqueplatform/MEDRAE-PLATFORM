"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient"; // adjust path if needed

export function RedirectToRoleDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    getRoleAndRedirect();
  }, [navigate]);

  if (loading) {
    // ✅ Unity-style global spinner
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-4 text-white text-lg">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return null; // nothing to show after redirect
}
