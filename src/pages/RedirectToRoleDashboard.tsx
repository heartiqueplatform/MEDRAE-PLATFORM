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

  // ✅ Professional spinner + message
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-medium text-muted-foreground">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}
